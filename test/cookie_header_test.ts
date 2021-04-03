import test from "ava";

import {parseSetCookieHeader} from "../src/cookie_header.js";

test("parse a simple header", (t) => {
  const header = "name=value";
  const parsedHeader = parseSetCookieHeader(header);
  t.deepEqual(parsedHeader, {name: "name", value: "value"});
});
