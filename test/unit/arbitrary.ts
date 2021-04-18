import fc from "fast-check";

// https://tools.ietf.org/html/rfc6265#section-4.1
export const setCookieHeader: fc.Arbitrary<string> = (() => {
  // https://tools.ietf.org/html/rfc2616#section-2.2
  const isToken = /[^ ()<>@,;:\\"\/\[\]?={}]/;
  const isCookieOctet = /[^ ",;\\]/;
  const name = fc.stringOf(
    fc.char().filter((x) => isToken.test(x)),
    {minLength: 1},
  );
  const unquotedValue = fc.stringOf(
    fc.char().filter((x) => isCookieOctet.test(x)),
    {minLength: 1},
  );
  const quotedValue = unquotedValue.map((x) => `"${x}"`);
  const value = fc.oneof(unquotedValue, quotedValue);
  const expires = fc.date().map((x) => x.toString());
  const maxAge = fc.integer();
  const domain = unquotedValue;
  const path = unquotedValue;
  const secure = fc.boolean();
  const httpOnly = fc.boolean();
  const sameSite = fc.oneof(
    fc.constant("Strict"),
    fc.constant("Lax"),
    fc.constant("None"),
  );
  const attributes = fc
    .record({
      expires,
      maxAge,
      domain,
      path,
      secure,
      httpOnly,
      sameSite,
    })
    .chain((cookie) => {
      const attributesWithValues = [
        ["Expires", cookie.expires],
        ["Max-Age", cookie.maxAge],
        ["Domain", cookie.domain],
        ["Path", cookie.path],
        ["Same-Site", cookie.sameSite],
      ]
        .filter(([, value]) => value)
        .map(([name, value]) => `${name}=${value}`);
      const attributesWithoutValues = ([
        ["Secure", cookie.secure],
        ["HttpOnly", cookie.httpOnly],
      ] as [string, boolean][])
        .filter(([, value]) => value)
        .map(([name]) => name);
      return fc.shuffledSubarray(
        attributesWithValues.concat(attributesWithoutValues),
      );
    });
  return fc
    .record({name, value, attributes})
    .map(({name, value, attributes}) => {
      return [`${name}=${value}`, ...attributes].join("; ");
    });
})();
