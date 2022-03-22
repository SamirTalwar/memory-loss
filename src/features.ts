import browser from "webextension-polyfill";

export interface Features {
  overwriteExistingCookies: FeatureSwitch;
}

export type FeatureSwitch =
  | {enabled: true}
  | {enabled: false; explanation: string};

export const status = async (): Promise<Features> => {
  const browserInfo = await browser.runtime.getBrowserInfo();
  if (browserInfo.name === "Firefox") {
    const majorVersion = parseInt(browserInfo.version.replace(/\.+/, ""));
    const cookieConfig = await browser.privacy.websites.cookieConfig.get({});
    if (
      majorVersion >= 86 &&
      majorVersion < 94 &&
      cookieConfig.value.behavior === "reject_trackers_and_partition_foreign"
    ) {
      return {
        overwriteExistingCookies: {
          enabled: false,
          explanation:
            'Typically, we would offer you a button to overwrite these cookies with a limit. However, Firefox 86 and up enable a wonderful feature named Total Cookie Protection when privacy is set to "Strict". This feature has a bug which stops us from overwriting cookies which have been "isolated". This bug is fixed in Firefox 94. Please update your browser to remedy this.',
        },
      };
    }
  }
  return {
    overwriteExistingCookies: {enabled: true},
  };
};
