const errorBox = document.getElementById("error")!;
const errorMessageElement = document.getElementById("error-message")!;
const dismissErrorButton = document.getElementById("error-dismiss")!;

const limitSelector = document.getElementById("option-limit")!;
const limitAllCookies = document.getElementById("limit-all-cookies")!;

const showError = (error: any): void => {
  errorBox.style.display = "block";
  if (error instanceof Error) {
    errorMessageElement.textContent = `Error: ${error.message}`;
    if (error.stack) {
      errorMessageElement.textContent += "\nStack trace:\n" + error.stack;
    }
  } else {
    errorMessageElement.textContent = `Error: ${error}`;
  }
};

(async () => {
  const {default: browser} = await import("webextension-polyfill");
  const features = await import("./features");
  const options = await import("./options");

  const currentFeatures = await features.status();
  const currentOptions = await options.get();

  const limitSelector = document.getElementById("option-limit")!;
  const limitAllCookies = document.getElementById("limit-all-cookies")!;

  const refreshPage = async () => {
    const violatingCookiesSection =
      document.getElementById("violating-cookies")!;
    const violatingCookiesDescription = document.getElementById(
      "violating-cookies-description",
    )!;
    const violatingCookiesDisabled = document.getElementById(
      "violating-cookies-disabled",
    )!;
    const violatingCookiesAction = document.getElementById(
      "violating-cookies-action",
    )!;

    if (currentFeatures.overwriteExistingCookies.enabled) {
      violatingCookiesDisabled.style.display = "none";
      violatingCookiesAction.style.display = "";
    } else {
      violatingCookiesDisabled.style.display = "block";
      violatingCookiesDisabled.textContent =
        currentFeatures.overwriteExistingCookies.explanation;
      violatingCookiesAction.style.display = "none";
    }

    if (currentOptions.cookieLimitInSeconds) {
      const now = Date.now() / 1000;
      const limit = now + currentOptions.cookieLimitInSeconds;
      const cookies = await browser.cookies.getAll({partitionKey: {}});
      const cookiesInViolation = cookies.filter(
        (cookie) =>
          cookie.expirationDate != null && cookie.expirationDate > limit,
      );
      const cookiesInViolationCount = cookiesInViolation.length;
      if (cookiesInViolationCount > 0) {
        violatingCookiesSection.style.display = "block";
        if (cookiesInViolationCount === 1) {
          violatingCookiesDescription.textContent =
            "There is 1 cookie that violates the above limit.";
        } else {
          violatingCookiesDescription.textContent = `There are ${cookiesInViolationCount} cookies that violate the above limit.`;
        }
      } else {
        violatingCookiesSection.style.display = "";
        violatingCookiesDescription.textContent = "";
      }
    } else {
      violatingCookiesSection.style.display = "";
      violatingCookiesDescription.textContent = "";
    }
  };

  await (async () => {
    dismissErrorButton.addEventListener("click", () => {
      errorBox.style.display = "none";
      errorMessageElement.textContent = "";
    });

    var selected = false;
    for (const {description, value} of options.COOKIE_LIMIT_OPTIONS) {
      const optionElement = document.createElement("option");
      optionElement.value = value.toString();
      optionElement.setAttribute("data-description", description);
      optionElement.textContent = description;
      if (value === currentOptions.cookieLimitInSeconds) {
        selected = true;
        optionElement.selected = true;
      }
      limitSelector.appendChild(optionElement);
    }

    const foreverOptionElement = document.createElement("option");
    foreverOptionElement.value = "";
    foreverOptionElement.setAttribute("data-description", "forever");
    foreverOptionElement.textContent = "forever";
    if (!selected) {
      foreverOptionElement.selected = true;
    }
    limitSelector.appendChild(foreverOptionElement);

    limitSelector.addEventListener("change", async (event) => {
      const cookieLimitValue = (event.target as HTMLSelectElement).value;
      currentOptions.cookieLimitInSeconds =
        cookieLimitValue.length > 0 ? parseInt(cookieLimitValue) : undefined;
      await options.set(currentOptions);
      await refreshPage();
    });

    limitAllCookies.addEventListener("click", async () => {
      try {
        if (currentOptions.cookieLimitInSeconds) {
          const now = (Date.now() / 1000) | 0;
          const maxExpirationDate = now + currentOptions.cookieLimitInSeconds;
          const cookies = await browser.cookies.getAll({partitionKey: {}});
          const limitedCookies = cookies
            .filter(
              (cookie) =>
                cookie.expirationDate != null &&
                cookie.expirationDate > maxExpirationDate,
            )
            .map((cookie) => {
              // We do not include `domain` in the generated cookie unless it
              // starts with a ".", which signifies that the cookie was actually
              // Set with a "Domain" attribute.
              const domain = cookie.domain.startsWith(".")
                ? cookie.domain
                : undefined;
              const urlProtocol = cookie.secure ? "https://" : "http://";
              const urlDomain = cookie.domain.startsWith(".")
                ? cookie.domain.substring(1)
                : cookie.domain;
              const url = urlProtocol + urlDomain + cookie.path;
              return {
                firstPartyDomain: cookie.firstPartyDomain,
                httpOnly: cookie.httpOnly,
                name: cookie.name,
                partitionKey: cookie.partitionKey,
                path: cookie.path,
                sameSite: cookie.sameSite,
                secure: cookie.secure,
                storeId: cookie.storeId,
                value: cookie.value,
                domain,
                url,
                expirationDate: maxExpirationDate,
              };
            });
          await Promise.all(
            limitedCookies.map((cookie) => browser.cookies.set(cookie)),
          );
          await refreshPage();
        }
      } catch (error) {
        showError(error);
      }
    });
  })();

  await refreshPage();
})().catch(showError);
