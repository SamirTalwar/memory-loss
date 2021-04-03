import test from "ava";

import {parseSetCookieHeader} from "../src/cookie_header.js";

test("parse a simple header", (t) => {
  const header = "name=value";
  const parsedHeader = parseSetCookieHeader(header);
  t.deepEqual(parsedHeader, {name: "name", value: "value"});
});

test("parse a complex header", (t) => {
  const header =
    'name="this is a long value!"; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Max-Age=2592000; Domain=example.com; Path=/dir; Secure; HttpOnly; SameSite=Strict';
  const parsedHeader = parseSetCookieHeader(header);
  t.deepEqual(parsedHeader, {
    name: "name",
    value: "this is a long value!",
    expires: new Date("Wed, 21 Oct 2015 07:28:00 GMT"),
    maxAge: 2592000,
    domain: "example.com",
    path: "/dir",
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  });
});
