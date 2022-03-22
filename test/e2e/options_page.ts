import {By, WebDriver} from "selenium-webdriver";

export interface OptionsPage {
  go: () => Promise<void>;
  selectLimit: (limit: string) => Promise<void>;
  limitAllCookies: () => Promise<void>;
  violatingCookiesDescription: () => Promise<string>;
  violatingCookiesDisabledExplanation: () => Promise<string>;
}

export default (driver: WebDriver, addonOptionsUrl: string): OptionsPage => {
  const pause = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 100));

  const go = () =>
    driver
      .navigate()
      .to(addonOptionsUrl)
      .then(() => pause());

  const selectLimit = async (limit: string) => {
    await driver.wait(async () => {
      try {
        const element = await driver.findElement(
          By.css(`#option-limit > option[data-description="${limit}"]`),
        );
        await element.click();
        await pause();
        return true;
      } catch (e) {
        return false;
      }
    });
  };

  const limitAllCookies = async () => {
    await driver
      .actions()
      .click(driver.findElement(By.id("limit-all-cookies")))
      .perform();
    await pause();
  };

  const violatingCookiesDescription = () =>
    driver
      .findElement(By.id("violating-cookies-description"))
      .then((element) => element.getText());

  const violatingCookiesDisabledExplanation = () =>
    driver
      .findElement(By.id("violating-cookies-disabled"))
      .then((element) => element.getText());

  return {
    go,
    selectLimit,
    limitAllCookies,
    violatingCookiesDescription,
    violatingCookiesDisabledExplanation,
  };
};
