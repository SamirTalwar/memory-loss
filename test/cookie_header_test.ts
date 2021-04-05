import test from "ava";
import fc from "fast-check";

import * as arbitrary from "./arbitrary.js";
import {SetCookieHeader} from "../src/cookie_header.js";

test("parse a simple header", (t) => {
  const header = "name=value";
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  t.is(parsedHeader.name(), "name");
  t.is(parsedHeader.value(), "value");
  t.is(parsedHeader.expires(), undefined);
  t.is(parsedHeader.maxAge(), undefined);
  t.is(parsedHeader.domain(), undefined);
  t.is(parsedHeader.path(), undefined);
  t.is(parsedHeader.secure(), false);
  t.is(parsedHeader.httpOnly(), false);
  t.is(parsedHeader.sameSite(), undefined);
});

test("parse a complex header", (t) => {
  const header =
    'name="this is a long value!"; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Max-Age=2592000; Domain=example.com; Path=/dir; Secure; HttpOnly; SameSite=Strict';
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  t.is(parsedHeader.name(), "name");
  t.is(parsedHeader.value(), "this is a long value!");
  t.deepEqual(
    parsedHeader.expires(),
    new Date("Wed, 21 Oct 2015 07:28:00 GMT"),
  );
  t.is(parsedHeader.maxAge(), 2592000);
  t.is(parsedHeader.domain(), "example.com");
  t.is(parsedHeader.path(), "/dir");
  t.is(parsedHeader.secure(), true);
  t.is(parsedHeader.httpOnly(), true);
  t.is(parsedHeader.sameSite(), "strict");
});

test("parse a header with an invalid Max-Age", (t) => {
  const header = "name=value; Max-Age=seven";
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  t.is(parsedHeader.name(), "name");
  t.is(parsedHeader.value(), "value");
  t.is(parsedHeader.maxAge(), NaN);
  const renderedHeader = parsedHeader.render();
  t.is(renderedHeader, header);
});

test("parse a header with an invalid Expires", (t) => {
  const header = "name=value; Expires=something";
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  t.is(parsedHeader.name(), "name");
  t.is(parsedHeader.value(), "value");
  t.deepEqual(parsedHeader.expires(), new Date("invalid"));
  const renderedHeader = parsedHeader.render();
  t.is(renderedHeader, header);
});

test("render a simple header", (t) => {
  const header = "name=some value";
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  const renderedHeader = parsedHeader.render();
  t.is(renderedHeader, header);
});

test("render a complex header in the same order it's parsed", (t) => {
  const header =
    "name=value; Expires=Sat, 3 Apr 2021 12:34:56 CEST; Max-Age=604800; Domain=www.example.com; Path=/dir; HttpOnly; SameSite=Strict";
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  const renderedHeader = parsedHeader.render();
  t.is(renderedHeader, header);
});

test("parse and re-render any header", (t) => {
  fc.assert(
    fc.property(arbitrary.setCookieHeader, (header) => {
      const parsedHeader = SetCookieHeader.parse(header);
      if (!parsedHeader) {
        return false;
      }
      const renderedHeader = parsedHeader.render();
      return renderedHeader == header;
    }),
  );
  t.pass();
});

test("set a Max-Age", (t) => {
  const header = "name=some value";
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  const updatedHeader = parsedHeader.updateMaxAge(60);
  const renderedHeader = updatedHeader.render();
  t.is(updatedHeader.maxAge(), 60);
  t.is(renderedHeader, "name=some value; Max-Age=60");
});

test("overwrite a Max-Age", (t) => {
  const header = "name=some value; Max-Age=60";
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  const updatedHeader = parsedHeader.updateMaxAge(120);
  const renderedHeader = updatedHeader.render();
  t.is(updatedHeader.maxAge(), 120);
  t.is(renderedHeader, "name=some value; Max-Age=120");
});

test("overwrite Expires with a Max-Age", (t) => {
  const header = "name=some value; Expires=Mon, 05 Apr 2021 09:45:00 GMT";
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    t.fail("Parsed header was undefined.");
    return;
  }
  const updatedHeader = parsedHeader.updateMaxAge(180);
  const renderedHeader = updatedHeader.render();
  t.is(updatedHeader.maxAge(), 180);
  t.is(updatedHeader.expires(), undefined);
  t.is(renderedHeader, "name=some value; Max-Age=180");
});
