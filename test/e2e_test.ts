import {Builder, WebDriver} from "selenium-webdriver";

let driver: WebDriver;

beforeEach(async () => {
  driver = await new Builder().forBrowser("firefox").build();
});

afterEach(async () => {
  await driver.close();
});

test("test", async () => {
  await driver.navigate().to("http://example.com/");
  const title = await driver.getTitle();
  expect(title).toBe("Example Domain");
});
