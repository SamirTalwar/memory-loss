import {Browser, WebRequest} from "webextension-polyfill-ts";

declare const browser: Browser;

(async () => {
  const {SetCookieHeader} = await import("./cookie_header");
  const logCookieHeaders = (
    details: WebRequest.OnHeadersReceivedDetailsType,
  ) => {
    const {url, responseHeaders} = details;
    const cookieHeaders = (responseHeaders || [])
      .filter((header) => header.name.toLowerCase() == "set-cookie")
      .flatMap((header) => {
        if (header.value) {
          const parsedHeader = SetCookieHeader.parse(header.value);
          if (parsedHeader) {
            return [{string: header.value, header: parsedHeader}];
          } else {
            return [];
          }
        } else {
          return [];
        }
      })
      .map(({string, header}) => ({
        name: header.name(),
        value: header.value(),
        expires: header.expires(),
        maxAge: header.maxAge(),
        string,
      }));
    if (cookieHeaders.length > 0) {
      console.log({url, cookieHeaders});
    }
    return {};
  };

  browser.webRequest.onHeadersReceived.addListener(
    logCookieHeaders,
    {urls: ["<all_urls>"]},
    ["blocking", "responseHeaders"],
  );
})().catch(console.error);
