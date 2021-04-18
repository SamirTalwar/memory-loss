import * as http from "http";
import * as util from "util";
import {Builder, By, WebDriver} from "selenium-webdriver";
import * as firefox from "selenium-webdriver/firefox";
import {getPrefs} from "./vendor/web-ext/src/firefox/preferences";
import {
  connectWithMaxRetries as connectToFirefox,
  findFreeTcpPort,
} from "./vendor/web-ext/src/firefox/remote";

import newCookieServer from "./cookie-server/server";

const ONE_MINUTE = 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const TWO_WEEKS = ONE_WEEK * 2;

const root = __dirname + "/../";

let cookieServerUrl: string;
let cookieServer: http.Server;
let driver: WebDriver;

const startCookieServer = async (): Promise<[string, http.Server]> => {
  const server = newCookieServer();
  const port = await findFreeTcpPort();
  await util.promisify(server.listen.bind(server, port))();
  const url = `http://localhost:${port}`;
  return [url, server];
};

const stopCookieServer = async (): Promise<void> => {
  if (cookieServer) {
    await util.promisify(cookieServer.close.bind(cookieServer))();
  }
};

const startFirefox = async (): Promise<WebDriver> => {
  const debugPort = await findFreeTcpPort();
  const options = new firefox.Options();
  options.addArguments("--start-debugger-server", debugPort.toString());
  options.headless();
  for (const [key, value] of Object.entries(getPrefs("firefox"))) {
    options.setPreference(key, value);
  }
  const driver = await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options)
    .build();
  try {
    const client = await connectToFirefox({port: debugPort});
    await client.installTemporaryAddon(root);
    return driver;
  } catch (error) {
    await driver.close();
    return Promise.reject(error);
  }
};

const stopFirefox = async (): Promise<void> => {
  if (driver) {
    await driver.close();
  }
};

beforeEach(async () => {
  [[cookieServerUrl, cookieServer], driver] = await Promise.all([
    startCookieServer(),
    startFirefox(),
  ]);
});

afterEach(async () => {
  await Promise.all([stopFirefox(), stopCookieServer()]);
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
  const now = Date.now() / 1000;
  await driver.navigate().to(cookieServerUrl);
  await submitNewCookie(
    "some_name",
    `some_name=the cookie value; Max-Age=${ONE_HOUR}; SameSite=Strict`,
  );

  const serverCookies = await readCookies();
  expect(serverCookies).toStrictEqual([
    {
      name: "some_name",
      value: "the cookie value",
    },
  ]);

  const cookie = await driver.manage().getCookie("some_name");
  expect(cookie.value).toBe("the cookie value");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_HOUR - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_HOUR + 5);
});

test("long-lived cookies are capped at a week", async () => {
  const now = Date.now() / 1000;
  await driver.navigate().to(cookieServerUrl);
  await submitNewCookie(
    "long_lived",
    `long_lived=some random value; Max-Age=${TWO_WEEKS}; SameSite=Strict`,
  );

  const serverCookies = await readCookies();
  expect(serverCookies).toStrictEqual([
    {
      name: "long_lived",
      value: "some random value",
    },
  ]);

  const cookie = await driver.manage().getCookie("long_lived");
  expect(cookie.value).toBe("some random value");
  expect(cookie.expiry).toBeGreaterThan(now + ONE_WEEK - 5);
  expect(cookie.expiry).toBeLessThan(now + ONE_WEEK + 5);
});
