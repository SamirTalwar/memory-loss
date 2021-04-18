import {parseDate} from "../../src/dates";

test.concurrent("parses an ISO-8601 date", async () => {
  const dateString = "1994-11-06T08:49:37Z";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test.concurrent("parses an RFC-1123 date", async () => {
  const dateString = "Sun, 06 Nov 1994 08:49:37 GMT";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test.concurrent("parses an RFC-1123 date with a long weekday", async () => {
  const dateString = "Sunday, 06 Nov 1994 08:49:37 GMT";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test.concurrent("parses an RFC-1036 date", async () => {
  const dateString = "Sunday, 06-Nov-1994 08:49:37 GMT";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test.concurrent("parses an RFC-1036 date with a short weekday", async () => {
  const dateString = "Sun, 06-Nov-1994 08:49:37 GMT";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test.concurrent("parses an asctime date", async () => {
  const dateString = "Sun Nov  6 08:49:37 1994";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});

test.concurrent("parses an asctime date with a long weekday", async () => {
  const dateString = "Sunday Nov  6 08:49:37 1994";
  const parsedDate = parseDate(dateString);
  expect(parsedDate).toStrictEqual(new Date(Date.UTC(1994, 10, 6, 8, 49, 37)));
});
