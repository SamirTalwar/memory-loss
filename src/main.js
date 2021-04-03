const logCookieHeaders = (details) => {
  const {url, responseHeaders} = details;
  const cookieHeaders = responseHeaders.filter(
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
