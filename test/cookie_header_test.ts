import test from "ava";

import {parseSetCookieHeader} from "../src/cookie_header.js";

test("parse a simple header", (t) => {
  const header = "name=value";
  const parsedHeader = parseSetCookieHeader(header);
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
  const parsedHeader = parseSetCookieHeader(header);
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
