interface SetCookieHeader {
  name: string;
  value: string;
}

export const parseSetCookieHeader = (
  header: string,
): SetCookieHeader | undefined => {
  const nameValuePair = header.split("=", 2);
  const [name, value] = nameValuePair;
  if (!name || !value) {
    return;
  }
  return {name, value};
};
