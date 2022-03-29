export const parseDate: (dateString: string) => Date | undefined = (() => {
  const months: {[month: string]: number} = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  const iso8601Date = {
    matcher:
      /^(\d{4})-(\d{2})-(\d{2})(?:t| +)(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?: +utc|z|[\+\-][\d:]+)$/,
    extractors: [1, 2, 3, 4, 5, 6],
  };
  const rfc1123Date = {
    matcher: /^\w{3,},? +(\d+) +(\w{3,}) +(\d+) +(\d{2}):(\d{2}):(\d{2}) +gmt$/,
    extractors: [3, 2, 1, 4, 5, 6],
  };
  const rfc850Date = {
    matcher: /^\w{3,},? +(\d+)-(\w{3,})-(\d+) +(\d{2}):(\d{2}):(\d{2}) +gmt$/,
    extractors: [3, 2, 1, 4, 5, 6],
  };
  const asctimeDate = {
    matcher: /^\w{3,},? +(\w{3,}) +(\d+) +(\d{2}):(\d{2}):(\d{2}) +(\d{4})$/,
    extractors: [6, 1, 2, 3, 4, 5],
  };
  const matchers = [iso8601Date, rfc1123Date, rfc850Date, asctimeDate];
  const isValid = (value: number | undefined): value is number =>
    value != null && !isNaN(value) && value >= 0;
  return (dateString: string): Date | undefined => {
    const trimmedDateString = dateString.trim().toLowerCase();
    for (const {matcher, extractors} of matchers) {
      const match = matcher.exec(trimmedDateString);
      if (match) {
        const [
          yearString,
          monthString,
          dayString,
          hoursString,
          minutesString,
          secondsString,
        ] = extractors.map((i) => match[i]);
        const [year, day, hours, minutes, seconds] = [
          yearString,
          dayString,
          hoursString,
          minutesString,
          secondsString,
        ].map((i) => (i == null ? NaN : parseInt(i)));
        const month =
          monthString == null
            ? undefined
            : months[monthString] != null
            ? months[monthString]
            : parseInt(monthString) - 1;
        if (
          !(
            isValid(year) &&
            isValid(month) &&
            isValid(day) &&
            isValid(hours) &&
            isValid(minutes) &&
            isValid(seconds)
          )
        ) {
          console.log({dateString, year, month, day, hours, minutes, seconds});
          console.log("Invalid!");
          continue;
        }
        return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      }
    }
    return;
  };
})();
