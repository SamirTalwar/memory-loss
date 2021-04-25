import * as http from "http";
import {By, WebDriver} from "selenium-webdriver";

import * as cookieServerManagement from "./cookie_server";
import * as firefoxManagement from "./firefox";

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const TWO_WEEKS = ONE_WEEK * 2;
const ONE_MONTH = ONE_DAY * 30;
const ONE_YEAR = ONE_DAY * 365;

let cookieServerUrl: string;
let cookieServer: http.Server;
let driver: WebDriver;
let addonOptionsUrl: string;

beforeAll(async () => {
  [
    [cookieServerUrl, cookieServer],
    [driver, addonOptionsUrl],
  ] = await Promise.all([
    cookieServerManagement.start(),
    firefoxManagement.start(),
  ]);
});

afterAll(async () => {
  await Promise.all([
    firefoxManagement.stop(driver),
    cookieServerManagement.stop(cookieServer),
  ]);
});

beforeEach(async () => {
  await driver.navigate().to(cookieServerUrl);
  await driver.manage().deleteAllCookies();
});

const submitNewCookie = async (
  name: string,
  setCookieHeader: string,
): Promise<void> => {
  await driver.findElement(By.name("new-cookie")).sendKeys(setCookieHeader);
  await driver
    .actions()
    .click(driver.findElement(By.id("submit-new-cookie")))
    .perform();
  await driver.wait(async () => {
    const cookieNameElements = await driver.findElements(
      By.css("#cookies .cookie-name"),
    );
    const cookieNames = await Promise.all(
      cookieNameElements.map((element) => element.getText()),
    );
    return cookieNames.indexOf(name) >= 0;
  });
};

const readCookies = async (): Promise<Array<{name: string; value: string}>> => {
  const cookieListItems = await driver.findElements(By.css("#cookies li"));
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

test("cookies are set as usual", async () => {
  await driver.navigate().to(cookieServerUrl);
  const now = Date.now() / 1000;
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

test("long-lived cookies are capped at a week", async () => {
  await driver.navigate().to(cookieServerUrl);
  const now = Date.now() / 1000;
  await submitNewCookie(
    "long_lived",
    `long_lived=some random value; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
  );

  const serverCookies = await readCookies();
  expect(serverCookies).toStrictEqual([
    {name: "long_lived", value: "some random value"},
  ]);

  const cookie = await driver.manage().getCookie("long_lived");
  expect(cookie.value).toBe("some random value");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_WEEK - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_WEEK + 5);
});

test("cookie expiry is configurable", async () => {
  await driver.navigate().to(addonOptionsUrl);
  const limit = await driver.findElement(By.name("limit"));
  await limit.sendKeys("1 month");

  await driver.navigate().to(cookieServerUrl);
  const now = Date.now() / 1000;
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
