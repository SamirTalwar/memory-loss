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
      return optionally((s) => new Date(s), findAttributeValue("Expires"));
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
