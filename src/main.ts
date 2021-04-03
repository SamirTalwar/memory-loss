import {Browser, WebRequest} from "webextension-polyfill-ts";

declare const browser: Browser;
declare const console: {log: (...items: any) => void};

const logCookieHeaders = (details: WebRequest.OnHeadersReceivedDetailsType) => {
  const {url, responseHeaders} = details;
  const cookieHeaders = (responseHeaders || []).filter(
    (header) => header.name.toLowerCase() == "set-cookie",
  );
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
