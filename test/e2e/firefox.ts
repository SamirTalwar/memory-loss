import * as path from "path";
import {Builder, WebDriver} from "selenium-webdriver";
import * as firefox from "selenium-webdriver/firefox";
import {getPrefs} from "../vendor/web-ext/src/firefox/preferences";
import {
  connectWithMaxRetries as connectToFirefox,
  findFreeTcpPort,
} from "../vendor/web-ext/src/firefox/remote";

type Preference = [string, string | number | boolean];

const root = path.resolve(__dirname, "..", "..");
const addonDirectory = path.resolve(root, "build", "test");

const webExtPreferences: Preference[] = Object.entries(getPrefs("firefox"));
const strictPrivacyPreferences: Preference[] = [
  ["network.cookie.cookieBehavior", 5],
  ["privacy.annotate_channels.strict_list.enabled", true],
  ["privacy.trackingprotection.enabled", true],
  ["privacy.trackingprotection.socialtracking.enabled", true],
];

export const start = async (
  extraPreferences: Preference[] = [],
): Promise<[WebDriver, string]> => {
  const debugPort = await findFreeTcpPort();
  const options = new firefox.Options();
  options.addArguments("--start-debugger-server", debugPort.toString());
  if (process.env["TEST_BROWSER_HEADLESS"] !== "false") {
    options.headless();
  }
  for (const [key, value] of webExtPreferences.concat(extraPreferences)) {
    options.setPreference(key, value);
  }
  const driver = await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options)
    .build();
  try {
    const client = await connectToFirefox({port: debugPort});
    await client.installTemporaryAddon(addonDirectory);
    await driver.wait(async (d) => {
      const url = await d.getCurrentUrl();
      return url.startsWith("moz-extension://");
    }, 5000);
    const addonOptionsUrl = await driver.getCurrentUrl();
    await driver.navigate().to("about:blank");
    return [driver, addonOptionsUrl];
  } catch (error) {
    await driver.close();
    return Promise.reject(error);
  }
};

export const startStrict = async (): Promise<[WebDriver, string]> =>
  start(strictPrivacyPreferences);

export const stop = async (driver: WebDriver | undefined): Promise<void> => {
  if (driver) {
    await driver.close();
  }
};
