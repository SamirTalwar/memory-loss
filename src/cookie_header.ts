interface SetCookieHeader {
  name(): string;
  value(): string;
  expires(): Date | undefined;
  maxAge(): number | undefined;
  domain(): string | undefined;
  path(): string | undefined;
  secure(): boolean;
  httpOnly(): boolean;
  sameSite(): string | undefined;

  updateMaxAge(maxAge: number): SetCookieHeader;

  render(): string;
}

type Attribute = [string, string | undefined];
type Attributes = Attribute[];

const optionally = <A, B>(
  f: (value: A) => B,
  value: A | undefined,
): B | undefined => {
  if (value == null) {
    return undefined;
  } else {
    return f(value);
  }
};

const parseDate: (dateString: string) => Date | undefined = (() => {
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
    matcher: /^(\d{4})-(\d{2})-(\d{2})(?:t| +)(\d{2}):(\d{2}):(\d{2})(?:\.\d+)(?: +utc|z|[\+\-][\d:]+)$/,
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

const joinAttribute = (attribute: Attribute): string => {
  const [name, value] = attribute;
  if (!value) {
    return name;
  } else {
    return `${name}=${value}`;
  }
};

const splitAttribute = (attributeString: string): Attribute => {
  const offset = attributeString.indexOf("=");
  if (offset < 0) {
    return [attributeString, undefined];
  } else {
    return [
      attributeString.substring(0, offset),
      attributeString.substring(offset + 1),
    ];
  }
};

const fromAttributes = (
  name: string,
  value: string,
  attributes: Attributes,
): SetCookieHeader => {
  const isAttributeName = (
    expectedName: string,
  ): ((attribute: Attribute) => boolean) => {
    const expectedLowerCaseName = expectedName.toLowerCase();
    return (attribute) => expectedLowerCaseName == attribute[0].toLowerCase();
  };
  const isNotAttributeName = (
    expectedName: string,
  ): ((attribute: Attribute) => boolean) => {
    const isExpected = isAttributeName(expectedName);
    return (attribute) => !isExpected(attribute);
  };
  const attributeIsSet = (attributeName: string): boolean =>
    !!attributes.find(isAttributeName(attributeName));
  const findAttributeValue = (attributeName: string): string | undefined => {
    const attribute = attributes.find(isAttributeName(attributeName));
    return optionally(([, value]) => value || "", attribute);
  };
  const updateAttribute = (attributeName: string, attributeValue: string) => (
    attributes: Attributes,
  ): Attributes => {
    const index = attributes.findIndex(isAttributeName(attributeName));
    if (index < 0) {
      return attributes.concat([[attributeName, attributeValue]]);
    } else {
      return attributes
        .slice(0, index)
        .concat([[attributeName, attributeValue]], attributes.slice(index + 1));
    }
  };
  const removeAttribute = (attributeName: string) => (
    attributes: Attributes,
  ): Attributes => attributes.filter(isNotAttributeName(attributeName));

  return {
    name() {
      return name;
    },
    value() {
      return value[0] === '"' && value[value.length - 1] === '"'
        ? value.substring(1, value.length - 1)
        : value;
    },
    expires() {
      return optionally(parseDate, findAttributeValue("Expires"));
    },
    maxAge() {
      return optionally(parseInt, findAttributeValue("Max-Age"));
    },
    domain() {
      return findAttributeValue("Domain");
    },
    path() {
      return findAttributeValue("Path");
    },
    secure() {
      return attributeIsSet("Secure");
    },
    httpOnly() {
      return attributeIsSet("HttpOnly");
    },
    sameSite() {
      return findAttributeValue("SameSite")?.toLowerCase();
    },

    updateMaxAge(maxAge: number) {
      const newAttributes = updateAttribute(
        "Max-Age",
        maxAge.toString(),
      )(removeAttribute("Expires")(attributes));
      return fromAttributes(name, value, newAttributes);
    },

    render() {
      return [joinAttribute([name, value])]
        .concat(attributes.map(joinAttribute))
        .join("; ");
    },
  };
};

export const SetCookieHeader = {
  parse: (headerString: string): SetCookieHeader | undefined => {
    const pairs = headerString.split(/;\s*/);
    const [nameValue, ...attributes] = pairs.map(splitAttribute);
    if (!nameValue) {
      return;
    }
    const [name, value] = nameValue;
    if (!value) {
      return;
    }
    return fromAttributes(name, value, attributes);
  },
};
