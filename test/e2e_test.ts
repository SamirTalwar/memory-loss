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
  for (const [key, value] of Object.entries(
    getPrefs("firefox") as {[key: string]: string | number | boolean},
  )) {
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

test("cookies are set as usual", async () => {
  const now = Date.now() / 1000;
  await driver.navigate().to(cookieServerUrl);
  await driver
    .findElement(By.name("new-cookie"))
    .sendKeys("some_name=the cookie value; Max-Age=3600; SameSite=Strict");
  await driver
    .actions()
    .click(driver.findElement(By.id("submit-new-cookie")))
    .perform();
  await driver.wait(async () => {
    const cookieListItems = await driver.findElements(By.css("#cookies li"));
    return cookieListItems.length > 0;
  });

  const cookieListItems = await driver.findElements(By.css("#cookies li"));
  const serverCookies = await Promise.all(
    cookieListItems.map((item) =>
      Promise.all([
        item.findElement(By.css(".cookie-name")).getText(),
        item.findElement(By.css(".cookie-value")).getText(),
      ]),
    ),
  );
  expect(serverCookies).toStrictEqual([["some_name", "the cookie value"]]);

  const cookie = await driver.manage().getCookie("some_name");
  expect(cookie.value).toBe("the cookie value");
  expect(cookie.expiry).toBeGreaterThan(now + 3600 - 5);
  expect(cookie.expiry).toBeLessThan(now + 3600 + 5);
});
