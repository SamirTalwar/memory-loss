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
