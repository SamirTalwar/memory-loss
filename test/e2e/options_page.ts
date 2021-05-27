import {By, WebDriver} from "selenium-webdriver";

export interface OptionsPage {
  go: () => Promise<void>;
  selectLimit: (limit: string) => Promise<void>;
  limitAllCookies: () => Promise<void>;
  violatingCookiesDescription: () => Promise<string>;
}

export default (driver: WebDriver, addonOptionsUrl: string): OptionsPage => {
  const go = () => driver.navigate().to(addonOptionsUrl);

  const selectLimit = async (limit: string) => {
    const limitOption = await driver.findElement(
      By.css(`#option-limit > option[data-description="${limit}"]`),
    );
    await limitOption.click();
  };

  const limitAllCookies = async () => {
    await driver
      .actions()
      .click(driver.findElement(By.id("limit-all-cookies")))
      .perform();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const violatingCookiesDescription = () =>
    driver
      .findElement(By.id("violating-cookies-description"))
      .then((element) => element.getText());

  return {
    go,
    selectLimit,
    limitAllCookies,
    violatingCookiesDescription,
  };
};
