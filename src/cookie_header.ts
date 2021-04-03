interface SetCookieHeader {
  name: string;
  value: string;
  expires?: Date;
  maxAge?: number;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
}

export const parseSetCookieHeader = (
  headerString: string,
): SetCookieHeader | undefined => {
  const [firstSection, ...sections] = headerString.split(/;\s*/);
  if (!firstSection) {
    return;
  }
  const [name, value] = firstSection.split("=", 2);
  if (!name || !value) {
    return;
  }
  const unquotedValue =
    value[0] === '"' && value[value.length - 1] === '"'
      ? value.substring(1, value.length - 1)
      : value;
  const header: SetCookieHeader = {name, value: unquotedValue};
  for (const section of sections) {
    const [sectionName, sectionValue] = section.split("=", 2);
    if (!sectionName) {
      continue;
    }
    switch (sectionName.toLowerCase()) {
      case "secure":
        header.secure = true;
        break;
      case "httponly":
        header.httpOnly = true;
        break;
    }
    if (!sectionValue) {
      continue;
    }
    switch (sectionName.toLowerCase()) {
      case "expires":
        header.expires = new Date(sectionValue);
        break;
      case "max-age":
        header.maxAge = parseInt(sectionValue);
        break;
      case "domain":
        header.domain = sectionValue;
        break;
      case "path":
        header.path = sectionValue;
        break;
      case "samesite":
        header.sameSite = sectionValue.toLowerCase();
        break;
    }
  }
  return header;
};
