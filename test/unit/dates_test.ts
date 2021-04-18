import {parseDate} from "../../src/dates";

test("parses an ISO-8601 date", () => {
  const dateString = "1994-11-06T08:49:37Z";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test("parses an RFC-1123 date", () => {
  const dateString = "Sun, 06 Nov 1994 08:49:37 GMT";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test("parses an RFC-1123 date with a long weekday", () => {
  const dateString = "Sunday, 06 Nov 1994 08:49:37 GMT";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test("parses an RFC-1036 date", () => {
  const dateString = "Sunday, 06-Nov-1994 08:49:37 GMT";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test("parses an RFC-1036 date with a short weekday", () => {
  const dateString = "Sun, 06-Nov-1994 08:49:37 GMT";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test("parses an asctime date", () => {
  const dateString = "Sun Nov  6 08:49:37 1994";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test("parses an asctime date with a long weekday", () => {
  const dateString = "Sunday Nov  6 08:49:37 1994";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});
