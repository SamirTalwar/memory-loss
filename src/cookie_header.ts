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

export const SetCookieHeader = {
  parse: (headerString: string): SetCookieHeader | undefined => {
    const [firstPair, ...pairs] = headerString.split(/;\s*/);
    if (!firstPair) {
      return;
    }

    const [name, value] = firstPair.split("=", 2);
    if (!name || !value) {
      return;
    }

    const sections = pairs.map((pair) => pair.split("=", 2));
    const findBooleanValue = (sectionName: string): boolean => {
      for (const section of sections) {
        if ((section[0] || "").toLowerCase() === sectionName) {
          return true;
        }
      }
      return false;
    };
    const findValue = (sectionName: string): string | undefined => {
      for (const section of sections) {
        if ((section[0] || "").toLowerCase() === sectionName) {
          return section.length >= 2 ? section[1] : "";
        }
      }
      return undefined;
    };
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
