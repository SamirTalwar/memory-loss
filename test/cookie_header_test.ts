import fc from "fast-check";

import * as arbitrary from "./arbitrary";
import {SetCookieHeader} from "../src/cookie_header";

const parseOrFail = (header: string): SetCookieHeader => {
  const parsedHeader = SetCookieHeader.parse(header);
  if (!parsedHeader) {
    fail("Parsed header was undefined.");
  }
  return parsedHeader;
};

test("parse a simple header", () => {
  const header = "name=value";
  const parsedHeader = parseOrFail(header);
  expect(parsedHeader.name()).toBe("name");
  expect(parsedHeader.value()).toBe("value");
  expect(parsedHeader.expires()).toBe(undefined);
  expect(parsedHeader.maxAge()).toBe(undefined);
  expect(parsedHeader.domain()).toBe(undefined);
  expect(parsedHeader.path()).toBe(undefined);
  expect(parsedHeader.secure()).toBe(false);
  expect(parsedHeader.httpOnly()).toBe(false);
  expect(parsedHeader.sameSite()).toBe(undefined);
});

test("parse a complex header", () => {
  const header =
    'name="this is a long value!"; Expires=Wed, 21 Oct 2015 07:28:00 GMT; Max-Age=2592000; Domain=example.com; Path=/dir; Secure; HttpOnly; SameSite=Strict';
  const parsedHeader = parseOrFail(header);
  expect(parsedHeader.name()).toBe("name");
  expect(parsedHeader.value()).toBe("this is a long value!");
  expect(parsedHeader.expires()).toStrictEqual(
    new Date("Wed, 21 Oct 2015 07:28:00 GMT"),
  );
  expect(parsedHeader.maxAge()).toBe(2592000);
  expect(parsedHeader.domain()).toBe("example.com");
  expect(parsedHeader.path()).toBe("/dir");
  expect(parsedHeader.secure()).toBe(true);
  expect(parsedHeader.httpOnly()).toBe(true);
  expect(parsedHeader.sameSite()).toBe("strict");
});

test("parse a header with an invalid Max-Age", () => {
  const header = "name=value; Max-Age=seven";
  const parsedHeader = parseOrFail(header);
  expect(parsedHeader.name()).toBe("name");
  expect(parsedHeader.value()).toBe("value");
  expect(parsedHeader.maxAge()).toBe(NaN);
  const renderedHeader = parsedHeader.render();
  expect(renderedHeader).toBe(header);
});

test("parse a header with an invalid Expires", () => {
  const header = "name=value; Expires=something";
  const parsedHeader = parseOrFail(header);
  expect(parsedHeader.name()).toBe("name");
  expect(parsedHeader.value()).toBe("value");
  expect(parsedHeader.expires()).toBe(undefined);
  const renderedHeader = parsedHeader.render();
  expect(renderedHeader).toBe(header);
});

test("parse a header with an ISO-8601 timestamp in the Expires attribute", () => {
  const header = "name=value; Expires=2023-04-05T12:48:00.000Z";
  const parsedHeader = parseOrFail(header);
  expect(parsedHeader.expires()).toStrictEqual(
    new Date("2023-04-05T12:48:00Z"),
  );
  const renderedHeader = parsedHeader.render();
  expect(renderedHeader).toBe(header);
});

test("parse a header with hyphens in the Expires attribute", () => {
  const header = "name=value; Expires=Fri, 01-Jan-2038 00:00:00 GMT";
  const parsedHeader = parseOrFail(header);
  expect(parsedHeader.expires()).toStrictEqual(
    new Date("2038-01-01T00:00:00Z"),
  );
  const renderedHeader = parsedHeader.render();
  expect(renderedHeader).toBe(header);
});

test("parse an Expires attribute in the past", () => {
  const header = "name=value; Expires=Thu, 01-Jan-1970 00:00:00 GMT";
  const parsedHeader = parseOrFail(header);
  expect(parsedHeader.expires()).toStrictEqual(new Date(0));
  const renderedHeader = parsedHeader.render();
  expect(renderedHeader).toBe(header);
});

test("parse a Max-Age attribute in the past", () => {
  const header = "name=value; Max-Age=-60";
  const parsedHeader = parseOrFail(header);
  expect(parsedHeader.maxAge()).toBe(-60);
  const renderedHeader = parsedHeader.render();
  expect(renderedHeader).toBe(header);
});

test("render a simple header", () => {
  const header = "name=some value";
  const parsedHeader = parseOrFail(header);
  const renderedHeader = parsedHeader.render();
  expect(renderedHeader).toBe(header);
});

test("render a complex header in the same order it's parsed", () => {
  const header =
    "name=value; Expires=Sat, 3 Apr 2021 12:34:56 CEST; Max-Age=604800; Domain=www.example.com; Path=/dir; HttpOnly; SameSite=Strict";
  const parsedHeader = parseOrFail(header);
  const renderedHeader = parsedHeader.render();
  expect(renderedHeader).toBe(header);
});

test("parse and re-render any header", () => {
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
});

test("set a Max-Age", () => {
  const header = "name=some value";
  const parsedHeader = parseOrFail(header);
  const updatedHeader = parsedHeader.updateMaxAge(60);
  const renderedHeader = updatedHeader.render();
  expect(updatedHeader.maxAge()).toBe(60);
  expect(renderedHeader).toBe("name=some value; Max-Age=60");
});

test("overwrite a Max-Age", () => {
  const header = "name=some value; Max-Age=60";
  const parsedHeader = parseOrFail(header);
  const updatedHeader = parsedHeader.updateMaxAge(120);
  const renderedHeader = updatedHeader.render();
  expect(updatedHeader.maxAge()).toBe(120);
  expect(renderedHeader).toBe("name=some value; Max-Age=120");
});

test("overwrite Expires with a Max-Age", () => {
  const header = "name=some value; Expires=Mon, 05 Apr 2021 09:45:00 GMT";
  const parsedHeader = parseOrFail(header);
  const updatedHeader = parsedHeader.updateMaxAge(180);
  const renderedHeader = updatedHeader.render();
  expect(updatedHeader.maxAge()).toBe(180);
  expect(updatedHeader.expires()).toBe(undefined);
  expect(renderedHeader).toBe("name=some value; Max-Age=180");
});
