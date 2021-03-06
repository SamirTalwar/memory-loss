import * as childProcess from "child_process";
import * as http from "http";
import * as net from "net";
import * as util from "util";
import {WebDriver} from "selenium-webdriver";

import newCookiePage, {CookiePage} from "./cookie_page";
import newOptionsPage, {OptionsPage} from "./options_page";
import * as cookieServerManagement from "./cookie_server";
import * as firefoxManagement from "./firefox";

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const TWO_WEEKS = ONE_WEEK * 2;
const ONE_MONTH = ONE_DAY * 30;
const ONE_YEAR = ONE_DAY * 365;

const execFile = util.promisify(childProcess.execFile);

let host: string;
let port: number;
let cookieServerUrl: string;
let cookieServerUrlWithHostname: string;
let cookieServerUrlWithIPv6: string;
let cookieServer: http.Server;
let driver: WebDriver;
let optionsPage: OptionsPage;

beforeAll(async () => {
  let addonOptionsUrl;
  [cookieServer, [driver, addonOptionsUrl]] = await Promise.all([
    cookieServerManagement.start(),
    firefoxManagement.start(),
  ]);
  optionsPage = newOptionsPage(driver, addonOptionsUrl);
  const hostnameProcess = await execFile("hostname");
  host = hostnameProcess.stdout;
  const cookieServerAddress = cookieServer.address() as net.AddressInfo | null;
  if (cookieServerAddress == null) {
    await cookieServerManagement.stop(cookieServer);
    throw new Error("The cookie server has no address.");
  }
  port = cookieServerAddress.port;
  cookieServerUrl = `http://localhost:${port}`;
  cookieServerUrlWithHostname = `http://${host}:${port}`;
  cookieServerUrlWithIPv6 = `http://[::1]:${port}`;
}, 10000);

afterAll(async () => {
  await Promise.all([
    firefoxManagement.stop(driver),
    cookieServerManagement.stop(cookieServer),
  ]);
});

beforeEach(async () => {
  for (const url of [
    cookieServerUrl,
    cookieServerUrlWithHostname,
    cookieServerUrlWithIPv6,
  ]) {
    await driver.navigate().to(url);
    await driver.manage().deleteAllCookies();
  }

  await optionsPage.go();
  await optionsPage.selectLimit("forever");
});

const testPreExistingCookies = async (
  host: string,
  port: number,
  cookiePage: CookiePage,
): Promise<void> => {
  const serverUrl = `http://${host}:${port}`;
  const cookies = [
    {
      name: "cookie",
      setCookieHeader: `cookie=123; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
    },
    {
      name: "cookie-with-domain",
      setCookieHeader: `cookie-with-domain=456; Domain=${host}; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
    },
  ];

  const now = Date.now() / 1000;
  await driver.navigate().to(serverUrl);
  for (const cookie of cookies) {
    await cookiePage.submitNewCookie(cookie.name, cookie.setCookieHeader);
  }

  await optionsPage.go();
  await optionsPage.selectLimit("1 week");

  await driver.navigate().to(serverUrl);
  const driverOptions = driver.manage();
  const cookiesBeforeLimiting = await Promise.all(
    cookies.map((cookie) => driverOptions.getCookie(cookie.name)),
  );
  for (const cookie of cookiesBeforeLimiting) {
    expect(cookie.expiry).toBeGreaterThan(now + TWO_WEEKS - 5);
    expect(cookie.expiry).toBeLessThan(now + TWO_WEEKS + 5);
  }

  await optionsPage.go();
  const violatingCookiesDescription =
    await optionsPage.violatingCookiesDescription();
  expect(violatingCookiesDescription).toBe(
    "There are 2 cookies that violate the above limit.",
  );

  const noViolatingCookiesDisabledExplanation =
    await optionsPage.violatingCookiesDisabledExplanation();
  expect(noViolatingCookiesDisabledExplanation).toBe("");

  await optionsPage.limitAllCookies();
  const nonViolatingCookiesDescription =
    await optionsPage.violatingCookiesDescription();
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

const testPreExistingThirdPartyCookies = async (
  driver: WebDriver,
  optionsPage: OptionsPage,
  cookiePage: CookiePage,
) => {
  const serverUrl = `${cookieServerUrl}/?thirdPartyDomain=${cookieServerUrlWithHostname}`;
  const cookies = [
    {
      name: "third-party-cookie",
      setCookieHeader: `third-party-cookie=123; Max-Age=${TWO_WEEKS}`,
    },
    {
      name: "third-party-cookie-with-domain",
      setCookieHeader: `third-party-cookie-with-domain=456; Domain=${host}; Max-Age=${TWO_WEEKS}`,
    },
  ];

  await driver.navigate().to(serverUrl);
  for (const cookie of cookies) {
    await cookiePage.submitNewThirdPartyCookie(
      cookie.name,
      cookie.setCookieHeader,
    );
  }

  await optionsPage.go();
  await optionsPage.selectLimit("1 week");

  await optionsPage.go();
  const violatingCookiesDescription =
    await optionsPage.violatingCookiesDescription();
  expect(violatingCookiesDescription).toBe(
    "There are 2 cookies that violate the above limit.",
  );

  const noViolatingCookiesDisabledExplanation =
    await optionsPage.violatingCookiesDisabledExplanation();
  expect(noViolatingCookiesDisabledExplanation).toBe("");

  await optionsPage.limitAllCookies();
  const nonViolatingCookiesDescription =
    await optionsPage.violatingCookiesDescription();
  expect(nonViolatingCookiesDescription).toBe("");
};

test("cookies are set as usual", async () => {
  const cookiePage = newCookiePage(driver);
  const now = Date.now() / 1000;
  await driver.navigate().to(cookieServerUrl);
  await cookiePage.submitNewCookie(
    "some_name",
    `some_name=the cookie value; Max-Age=${ONE_HOUR}; SameSite=Strict`,
  );

  const serverCookies = await cookiePage.readCookies();
  expect(serverCookies).toStrictEqual([
    {name: "some_name", value: "the cookie value"},
  ]);

  const cookie = await driver.manage().getCookie("some_name");
  expect(cookie.value).toBe("the cookie value");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_HOUR - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_HOUR + 5);
});

test("long-lived cookies are capped to the configuration", async () => {
  await optionsPage.go();
  await optionsPage.selectLimit("1 month");

  const cookiePage = newCookiePage(driver);
  const now = Date.now() / 1000;
  await driver.navigate().to(cookieServerUrl);
  await cookiePage.submitNewCookie(
    "forever",
    `forever=infinity; Max-Age=${ONE_YEAR}; SameSite=Strict`,
  );

  const serverCookies = await cookiePage.readCookies();
  expect(serverCookies).toStrictEqual([{name: "forever", value: "infinity"}]);

  const cookie = await driver.manage().getCookie("forever");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_MONTH - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_MONTH + 5);
});

test("third-party cookies are also capped", async () => {
  await optionsPage.go();
  await optionsPage.selectLimit("1 week");

  const cookiePage = newCookiePage(driver);
  const now = Date.now() / 1000;
  await driver
    .navigate()
    .to(`${cookieServerUrl}/?thirdPartyDomain=${cookieServerUrlWithHostname}`);
  await cookiePage.submitNewThirdPartyCookie(
    "wibble",
    `wibble=wobble; Max-Age=${ONE_MONTH}`,
  );

  const serverCookies = await cookiePage.readThirdPartyCookies();
  expect(serverCookies).toStrictEqual([{name: "wibble", value: "wobble"}]);

  await driver.navigate().to(cookieServerUrlWithHostname);
  const cookie = await driver.manage().getCookie("wibble");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_WEEK - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_WEEK + 5);
});

test("pre-existing, long-lived cookies for localhost can be limited in the Options page", () =>
  testPreExistingCookies("localhost", port, newCookiePage(driver)));

test("pre-existing, long-lived cookies for a hostname can be limited in the Options page", () =>
  testPreExistingCookies(host, port, newCookiePage(driver)));

test("pre-existing, long-lived cookies for an IPv4 address can be limited in the Options page", () =>
  testPreExistingCookies("127.0.0.1", port, newCookiePage(driver)));

// Firefox does not seem to handle setting IPv6 cookies. They end up with the wrong domain, e.g. "::1" instead of "[::1]".
test("pre-existing, long-lived cookies for an IPv6 address can be limited in the Options page", async () => {
  const host = "[::1]";
  const cookiePage = newCookiePage(driver);
  const serverUrl = `http://${host}:${port}`;
  const cookies = [
    {
      name: "cookie",
      setCookieHeader: `cookie=123; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
    },
    {
      name: "cookie-with-domain",
      setCookieHeader: `cookie-with-domain=456; Domain=${host}; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
    },
  ];

  const now = Date.now() / 1000;
  await driver.navigate().to(serverUrl);
  for (const cookie of cookies) {
    await cookiePage.submitNewCookie(cookie.name, cookie.setCookieHeader);
  }

  await optionsPage.go();
  await optionsPage.selectLimit("1 week");

  await driver.navigate().to(serverUrl);
  const driverOptions = driver.manage();
  const cookiesBeforeLimiting = await Promise.all(
    cookies.map((cookie) => driverOptions.getCookie(cookie.name)),
  );
  for (const cookie of cookiesBeforeLimiting) {
    expect(cookie.expiry).toBeGreaterThan(now + TWO_WEEKS - 5);
    expect(cookie.expiry).toBeLessThan(now + TWO_WEEKS + 5);
  }

  await optionsPage.go();
  const violatingCookiesDescription =
    await optionsPage.violatingCookiesDescription();
  expect(violatingCookiesDescription).toBe(
    "There are 2 cookies that violate the above limit.",
  );

  const violatingCookiesDisabledExplanation =
    await optionsPage.violatingCookiesDisabledExplanation();
  expect(violatingCookiesDisabledExplanation).toMatch(/IPv6/);
});

test("pre-existing, third-party, long-lived cookies can be limited in the Options page", async () => {
  await testPreExistingThirdPartyCookies(
    driver,
    optionsPage,
    newCookiePage(driver),
  );
});

test("pre-existing, third-party, long-lived cookies can be limited in the Options page with strict privacy protection", async () => {
  const [driver, addonOptionsUrl] = await firefoxManagement.startStrict();
  try {
    await testPreExistingThirdPartyCookies(
      driver,
      newOptionsPage(driver, addonOptionsUrl),
      newCookiePage(driver),
    );
  } finally {
    await firefoxManagement.stop(driver);
  }
}, 10000);
