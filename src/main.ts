import {Browser, WebRequest} from "webextension-polyfill-ts";
import {SetCookieHeader} from "./cookie_header";

declare const browser: Browser;

const MAXIMUM_COOKIE_EXPIRY_IN_SECONDS = 7 * 24 * 60 * 60;

(async () => {
  const {SetCookieHeader} = await import("./cookie_header");

  const limitCookieHeader = (
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
    if (oldMaxAge != null && oldMaxAge > MAXIMUM_COOKIE_EXPIRY_IN_SECONDS) {
      const newMaxAge =
        oldMaxAge != null && oldMaxAge > MAXIMUM_COOKIE_EXPIRY_IN_SECONDS
          ? MAXIMUM_COOKIE_EXPIRY_IN_SECONDS
          : oldMaxAge;
      return header.updateMaxAge(newMaxAge);
    } else {
      return;
    }
  };

  const limitCookieHeaders = (
    details: WebRequest.OnHeadersReceivedDetailsType,
  ) => {
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

          const newHeaderValue = limitCookieHeader(now, parsedHeader);
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
