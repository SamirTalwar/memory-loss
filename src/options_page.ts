const errorBox = document.getElementById("error")!;
const errorMessageElement = document.getElementById("error-message")!;
const dismissErrorButton = document.getElementById("error-dismiss")!;

const limitSelector = document.getElementById("option-limit")!;
const limitAllCookies = document.getElementById("limit-all-cookies")!;

const reportError = (error: any): void => {
  errorBox.style.display = "inherit";
  if (error instanceof Error) {
    errorMessageElement.textContent = `Error: ${error.message}`;
  } else {
    errorMessageElement.textContent = `Error: ${error}`;
  }
};

(async () => {
  const {browser} = await import("webextension-polyfill-ts");
  const options = await import("./options");

  const currentOptions = await options.get();

  const refreshPage = async () => {
    const violatingCookiesSection = document.getElementById(
      "violating-cookies",
    )!;
    const violatingCookiesDescription = document.getElementById(
      "violating-cookies-description",
    )!;
    if (currentOptions.cookieLimitInSeconds) {
      const now = Date.now() / 1000;
      const limit = now + currentOptions.cookieLimitInSeconds;
      const cookies = await browser.cookies.getAll({});
      const cookiesInViolation = cookies.filter(
        (cookie) =>
          cookie.expirationDate != null && cookie.expirationDate > limit,
      );
      const cookiesInViolationCount = cookiesInViolation.length;
      if (cookiesInViolationCount > 0) {
        violatingCookiesSection.style.display = "inherit";
        if (cookiesInViolationCount === 1) {
          violatingCookiesDescription.textContent =
            "There is 1 cookie that violates the above limit.";
        } else {
          violatingCookiesDescription.textContent = `There are ${cookiesInViolationCount} cookies that violate the above limit.`;
        }
      } else {
        violatingCookiesSection.style.display = "";
      }
    } else {
      violatingCookiesSection.style.display = "";
    }
  };

  await (async () => {
    dismissErrorButton.addEventListener("click", () => {
      errorBox.style.display = "";
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
          const now = Date.now() / 1000;
          const limit = now + currentOptions.cookieLimitInSeconds;
          const cookies = await browser.cookies.getAll({});
          await Promise.all(
            cookies
              .filter(
                (cookie) =>
                  cookie.expirationDate != null &&
                  cookie.expirationDate > limit,
              )
              .map((cookie) => ({
                domain: cookie.domain,
                firstPartyDomain: cookie.firstPartyDomain,
                httpOnly: cookie.httpOnly,
                name: cookie.name,
                path: cookie.path,
                sameSite: cookie.sameSite,
                secure: cookie.secure,
                storeId: cookie.storeId,
                value: cookie.value,
                expirationDate: limit,
                url:
                  (cookie as any).url ||
                  cookie.domain.replace(/^(\.)?/, "https://") + cookie.path,
              }))
              .map((cookie) => browser.cookies.set(cookie)),
          );
          await refreshPage();
        }
      } catch (error) {
        reportError(error);
      }
    });
  })();

  await refreshPage();
})().catch(reportError);
