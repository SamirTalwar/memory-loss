import * as childProcess from "child_process";
import * as http from "http";
import * as net from "net";
import * as util from "util";
import {By, WebDriver} from "selenium-webdriver";

import * as cookieServerManagement from "./cookie_server";
import * as firefoxManagement from "./firefox";

interface Cookie {
  name: string;
  value: string;
}

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const TWO_WEEKS = ONE_WEEK * 2;
const ONE_MONTH = ONE_DAY * 30;
const ONE_YEAR = ONE_DAY * 365;

let host: string;
let cookieServerUrl: string;
let cookieServerUrlWithIPv4: string;
let cookieServerUrlWithIPv6: string;
let cookieServerUrlWithHostname: string;
let cookieServer: http.Server;
let driver: WebDriver;
let addonOptionsUrl: string;

beforeAll(async () => {
  [cookieServer, [driver, addonOptionsUrl]] = await Promise.all([
    cookieServerManagement.start(),
    firefoxManagement.start(),
  ]);
  const hostnameProcess = await util.promisify(childProcess.execFile)(
    "hostname",
  );
  host = hostnameProcess.stdout;
  const cookieServerAddress = cookieServer.address() as net.AddressInfo | null;
  if (cookieServerAddress == null) {
    await cookieServerManagement.stop(cookieServer);
    throw new Error("The cookie server has no address.");
  }
  cookieServerUrl = `http://localhost:${cookieServerAddress.port}`;
  cookieServerUrlWithHostname = `http://${host}:${cookieServerAddress.port}`;
  cookieServerUrlWithIPv4 = `http://127.0.0.1:${cookieServerAddress.port}`;
  cookieServerUrlWithIPv6 = `http://[::1]:${cookieServerAddress.port}`;
}, 10000);

afterAll(async () => {
  await Promise.all([
    firefoxManagement.stop(driver),
    cookieServerManagement.stop(cookieServer),
  ]);
});

beforeEach(async () => {
  await driver.navigate().to(cookieServerUrl);
  await driver.manage().deleteAllCookies();

  await driver.navigate().to(addonOptionsUrl);
  const limitOption = await driver.findElement(
    By.css('#option-limit > option[data-description="forever"]'),
  );
  await limitOption.click();
});

const submitNewCookieIn =
  (targets: {newCookieInput: By; submitNewCookieButton: By; cookieNames: By}) =>
  async (name: string, setCookieHeader: string): Promise<void> => {
    await driver.findElement(targets.newCookieInput).sendKeys(setCookieHeader);
    await driver
      .actions()
      .click(driver.findElement(targets.submitNewCookieButton))
      .perform();
    await driver.wait(async () => {
      try {
        const cookieNameElements = await driver.findElements(
          targets.cookieNames,
        );
        const cookieNames = await Promise.all(
          cookieNameElements.map((element) => element.getText()),
        );
        return cookieNames.indexOf(name) >= 0;
      } catch (e) {
        return false;
      }
    }, 2000);
  };

const submitNewCookie = submitNewCookieIn({
  newCookieInput: By.name("new-cookie"),
  submitNewCookieButton: By.id("submit-new-cookie"),
  cookieNames: By.css("#cookies .cookie-name"),
});

const submitNewThirdPartyCookie = submitNewCookieIn({
  newCookieInput: By.name("new-third-party-cookie"),
  submitNewCookieButton: By.id("submit-new-third-party-cookie"),
  cookieNames: By.css("#third-party-cookies .cookie-name"),
});

const readCookiesIn =
  (cookieListItemsTarget: By) => async (): Promise<Cookie[]> => {
    const cookieListItems = await driver.findElements(cookieListItemsTarget);
    return Promise.all(
      cookieListItems.map(async (item) => {
        const [name, value] = await Promise.all([
          item.findElement(By.css(".cookie-name")).getText(),
          item.findElement(By.css(".cookie-value")).getText(),
        ]);
        return {name, value};
      }),
    );
  };

const readCookies = readCookiesIn(By.css("#cookies li"));

const readThirdPartyCookies = readCookiesIn(By.css("#third-party-cookies li"));

const testPreExistingCookies = async (
  serverUrl: string,
  setCookieHeaders: string[],
): Promise<void> => {
  const now = Date.now() / 1000;
  const cookies = setCookieHeaders.map((header) => ({
    name: header.split("=", 1)[0]!,
    setCookieHeader: header,
  }));

  await driver.navigate().to(serverUrl);
  for (const cookie of cookies) {
    await submitNewCookie(cookie.name, cookie.setCookieHeader);
  }

  await driver.navigate().to(addonOptionsUrl);
  const limitOption = await driver.findElement(
    By.css('#option-limit > option[data-description="1 week"]'),
  );
  await limitOption.click();

  await driver.navigate().to(serverUrl);
  const driverOptions = driver.manage();
  const cookiesBeforeLimiting = await Promise.all(
    cookies.map((cookie) => driverOptions.getCookie(cookie.name)),
  );
  for (const cookie of cookiesBeforeLimiting) {
    expect(cookie.expiry).toBeGreaterThan(now + TWO_WEEKS - 5);
    expect(cookie.expiry).toBeLessThan(now + TWO_WEEKS + 5);
  }

  await driver.navigate().to(addonOptionsUrl);
  const violatingCookiesDescription = await driver
    .findElement(By.id("violating-cookies-description"))
    .then((element) => element.getText());
  expect(violatingCookiesDescription).toMatch(
    /There (is|are) \d+ cookies? that violates? the above limit./,
  );

  await driver
    .actions()
    .click(driver.findElement(By.id("limit-all-cookies")))
    .perform();
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const nonViolatingCookiesDescription = await driver
    .findElement(By.id("violating-cookies-description"))
    .then((element) => element.getText());
  expect(nonViolatingCookiesDescription).toBe("");

  await driver.navigate().to(serverUrl);
  const cookiesAfterLimiting = await Promise.all(
    cookies.map((cookie) => driverOptions.getCookie(cookie.name)),
  );
  for (const cookie of cookiesAfterLimiting) {
    expect(cookie.expiry).toBeGreaterThan(now + ONE_WEEK - 5);
    expect(cookie.expiry).toBeLessThan(now + ONE_WEEK + 5);
  }
};

test("cookies are set as usual", async () => {
  const now = Date.now() / 1000;
  await driver.navigate().to(cookieServerUrl);
  await submitNewCookie(
    "some_name",
    `some_name=the cookie value; Max-Age=${ONE_HOUR}; SameSite=Strict`,
  );

  const serverCookies = await readCookies();
  expect(serverCookies).toStrictEqual([
    {name: "some_name", value: "the cookie value"},
  ]);

  const cookie = await driver.manage().getCookie("some_name");
  expect(cookie.value).toBe("the cookie value");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_HOUR - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_HOUR + 5);
});

test("long-lived cookies are capped to the configuration", async () => {
  await driver.navigate().to(addonOptionsUrl);
  const limitOption = await driver.findElement(
    By.css('#option-limit > option[data-description="1 month"]'),
  );
  await limitOption.click();

  const now = Date.now() / 1000;
  await driver.navigate().to(cookieServerUrl);
  await submitNewCookie(
    "forever",
    `forever=infinity; Max-Age=${ONE_YEAR}; SameSite=Strict`,
  );

  const serverCookies = await readCookies();
  expect(serverCookies).toStrictEqual([{name: "forever", value: "infinity"}]);

  const cookie = await driver.manage().getCookie("forever");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_MONTH - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_MONTH + 5);
});

test("third-party cookies are also capped", async () => {
  await driver.navigate().to(addonOptionsUrl);
  const limitOption = await driver.findElement(
    By.css('#option-limit > option[data-description="1 week"]'),
  );
  await limitOption.click();

  const now = Date.now() / 1000;
  await driver
    .navigate()
    .to(`${cookieServerUrl}/?thirdPartyDomain=${cookieServerUrlWithHostname}`);
  await submitNewThirdPartyCookie(
    "wibble",
    `wibble=wobble; Max-Age=${ONE_MONTH}`,
  );

  const serverCookies = await readThirdPartyCookies();
  expect(serverCookies).toStrictEqual([{name: "wibble", value: "wobble"}]);

  await driver.navigate().to(cookieServerUrlWithHostname);
  const cookie = await driver.manage().getCookie("wibble");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_WEEK - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_WEEK + 5);
});

test("pre-existing long-lived cookies for localhost can be limited in the Options page", () =>
  testPreExistingCookies(cookieServerUrl, [
    `localhost-cookie=123; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
    `localhost-cookie-with-domain=123; Domain=localhost; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
  ]));

test("pre-existing long-lived cookies for a hostname can be limited in the Options page", () =>
  testPreExistingCookies(cookieServerUrlWithHostname, [
    `hostname-cookie=345; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
    `hostname-cookie-with-domain=345; Domain=${host}; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
  ]));

test("pre-existing long-lived cookies for an IPv4 address can be limited in the Options page", () =>
  testPreExistingCookies(cookieServerUrlWithIPv4, [
    `ipv4-cookie=456; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
    `ipv4-cookie-with-domain=456; Domain=127.0.0.1; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
  ]));

// Firefox does not seem to handle setting IPv6 cookies. They end up with the wrong domain, e.g. "::1" instead of "[::1]".
test.skip("pre-existing long-lived cookies for an IPv6 address can be limited in the Options page", () =>
  testPreExistingCookies(cookieServerUrlWithIPv6, [
    `ipv6-cookie=678; Domain=[::1]; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
  ]));
