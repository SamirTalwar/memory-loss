import {Builder, WebDriver} from "selenium-webdriver";
import * as firefox from "selenium-webdriver/firefox";
import {getPrefs} from "./vendor/web-ext/src/firefox/preferences";
import {
  connectWithMaxRetries as connectToFirefox,
  findFreeTcpPort,
} from "./vendor/web-ext/src/firefox/remote";

const root = __dirname + "/../";

let driver: WebDriver;

beforeEach(async () => {
  const debugPort = await findFreeTcpPort();
  const options = new firefox.Options();
  options.addArguments("--start-debugger-server", debugPort.toString());
  for (const [key, value] of Object.entries(
    getPrefs("firefox") as {[key: string]: string | number | boolean},
  )) {
    options.setPreference(key, value);
  }
  driver = await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(options)
    .build();
  const client = await connectToFirefox({port: debugPort});
  await client.installTemporaryAddon(root);
});

afterEach(async () => {
  await driver.close();
});

test("test", async () => {
  await driver.navigate().to("http://example.com/");
  const title = await driver.getTitle();
  expect(title).toBe("Example Domain");
});

test("extension", async () => {
  await driver
    .navigate()
    .to(
      "about:devtools-toolbox?type=extension&id=memory-loss%40noodlesandwich.com",
    );
});
