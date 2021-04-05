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
  const findBooleanValue = (attributeName: string): boolean => {
    for (const [name] of attributes) {
      if (name.toLowerCase() === attributeName.toLowerCase()) {
        return true;
      }
    }
    return false;
  };
  const findValue = (attributeName: string): string | undefined => {
    for (const [name, value] of attributes) {
      if (name.toLowerCase() === attributeName.toLowerCase()) {
        return value || "";
      }
    }
    return undefined;
  };

  const updateAttribute = (attributeName: string, attributeValue: string) => (
    attributes: Attributes,
  ): Attributes => {
    const index = attributes.findIndex(
      ([name]) => name.toLowerCase() === attributeName.toLowerCase(),
    );
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
  ): Attributes =>
    attributes.filter(
      ([name]) => name.toLowerCase() !== attributeName.toLowerCase(),
    );

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
      return optionally((s) => new Date(s), findValue("Expires"));
    },
    maxAge() {
      return optionally(parseInt, findValue("Max-Age"));
    },
    domain() {
      return findValue("Domain");
    },
    path() {
      return findValue("Path");
    },
    secure() {
      return findBooleanValue("Secure");
    },
    httpOnly() {
      return findBooleanValue("HttpOnly");
    },
    sameSite() {
      return findValue("SameSite")?.toLowerCase();
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
