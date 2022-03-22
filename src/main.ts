import {WebRequest} from "webextension-polyfill";
import {SetCookieHeader} from "./cookie_header";

(async () => {
  const {default: browser} = await import("webextension-polyfill");
  const {SetCookieHeader} = await import("./cookie_header");
  const options = await import("./options");

  if (await options.neverConfigured()) {
    await browser.runtime.openOptionsPage();
  }

  const limitCookieHeader = (
    limitInSeconds: number,
    now: number,
    header: SetCookieHeader,
  ): SetCookieHeader | undefined => {
    const maxAge = header.maxAge();
    const expires = header.expires();
    const oldMaxAge =
      maxAge != null
        ? maxAge
        : expires != null
        ? expires.getTime() - now
        : undefined;
    if (oldMaxAge != null && oldMaxAge > limitInSeconds) {
      return header.updateMaxAge(limitInSeconds);
    } else {
      return;
    }
  };

  const limitCookieHeaders = async (
    details: WebRequest.OnHeadersReceivedDetailsType,
  ): Promise<WebRequest.BlockingResponse> => {
    const currentOptions = await options.get();
    if (!currentOptions.cookieLimitInSeconds) {
      return {};
    }

    const now = Date.now();
    const {url, responseHeaders} = details;
    const modifiedHeaders = (responseHeaders || []).map(
      (
        header: WebRequest.HttpHeadersItemType,
      ): WebRequest.HttpHeadersItemType => {
        if (header.name.toLowerCase() == "set-cookie" && header.value) {
          const parsedHeader = SetCookieHeader.parse(header.value);
          if (!parsedHeader) {
            console.warn("Could not parse a Set-Cookie header.", {header});
            return header;
          }

          const newHeaderValue = limitCookieHeader(
            currentOptions.cookieLimitInSeconds!,
            now,
            parsedHeader,
          );
          if (newHeaderValue != null) {
            console.info("Limited a cookie expiry.", {
              url,
              name: parsedHeader.name(),
            });
            return {...header, value: newHeaderValue.render()};
          } else {
            return header;
          }
        } else {
          return header;
        }
      },
    );
    return {responseHeaders: modifiedHeaders};
  };

  browser.webRequest.onHeadersReceived.addListener(
    limitCookieHeaders,
    {urls: ["<all_urls>"]},
    ["blocking", "responseHeaders"],
  );
})().catch(console.error);
