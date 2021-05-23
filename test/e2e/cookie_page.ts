import {By, WebDriver} from "selenium-webdriver";

interface Cookie {
  name: string;
  value: string;
}

export interface CookiePage {
  submitNewCookie: (name: string, setCookieHeader: string) => Promise<void>;
  submitNewThirdPartyCookie: (
    name: string,
    setCookieHeader: string,
  ) => Promise<void>;
  readCookies: () => Promise<Cookie[]>;
  readThirdPartyCookies: () => Promise<Cookie[]>;
}

export default (driver: WebDriver): CookiePage => {
  const submitNewCookieIn =
    (targets: {
      newCookieInput: By;
      submitNewCookieButton: By;
      cookieNames: By;
    }) =>
    async (name: string, setCookieHeader: string): Promise<void> => {
      await driver
        .findElement(targets.newCookieInput)
        .sendKeys(setCookieHeader);
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

  const submitNewThirdPartyCookie = async (
    name: string,
    setCookieHeader: string,
  ): Promise<void> => {
    await submitNewCookieIn({
      newCookieInput: By.name("new-third-party-cookie"),
      submitNewCookieButton: By.id("submit-new-third-party-cookie"),
      cookieNames: By.css("#third-party-cookies .cookie-name"),
    })(name, setCookieHeader);
    const newCookieInput = await driver.findElement(
      By.name("new-third-party-cookie"),
    );
    await newCookieInput.clear();
  };

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

  const readThirdPartyCookies = readCookiesIn(
    By.css("#third-party-cookies li"),
  );

  return {
    submitNewCookie,
    submitNewThirdPartyCookie,
    readCookies,
    readThirdPartyCookies,
  };
};
