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

  render(): string;
}

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

const splitPair = (pair: string): [string, string | undefined] => {
  const offset = pair.indexOf("=");
  if (offset < 0) {
    return [pair, undefined];
  } else {
    return [pair.substring(0, offset), pair.substring(offset + 1)];
  }
};

export const SetCookieHeader = {
  parse: (headerString: string): SetCookieHeader | undefined => {
    const [firstPair, ...pairs] = headerString.split(/;\s*/);
    if (!firstPair) {
      return;
    }

    const attributes = pairs.map(splitPair);
    const findBooleanValue = (attributeName: string): boolean => {
      for (const [name] of attributes) {
        if (name.toLowerCase() === attributeName) {
          return true;
        }
      }
      return false;
    };
    const findValue = (attributeName: string): string | undefined => {
      for (const [name, value] of attributes) {
        if (name.toLowerCase() === attributeName) {
          return value || "";
        }
      }
      return undefined;
    };

    const [name, value] = splitPair(firstPair);
    if (!value) {
      return;
    }

    const self = {
      name() {
        return name;
      },
      value() {
        return value[0] === '"' && value[value.length - 1] === '"'
          ? value.substring(1, value.length - 1)
          : value;
      },
      expires() {
        return optionally((s) => new Date(s), findValue("expires"));
      },
      maxAge() {
        return optionally(parseInt, findValue("max-age"));
      },
      domain() {
        return findValue("domain");
      },
      path() {
        return findValue("path");
      },
      secure() {
        return findBooleanValue("secure");
      },
      httpOnly() {
        return findBooleanValue("httponly");
      },
      sameSite() {
        return findValue("samesite")?.toLowerCase();
      },

      render() {
        return [firstPair, ...pairs].join("; ");
      },
    };
    return self;
  },
};
