import {browser} from "webextension-polyfill-ts";

export interface Options {
  cookieLimitInSeconds: number | undefined;
}

const DAYS = 24 * 60 * 60;

const OPTIONS_STORAGE_KEYS: Array<keyof Options> = ["cookieLimitInSeconds"];

const DEFAULT_OPTIONS: Options = {
  cookieLimitInSeconds: undefined,
};

export const COOKIE_LIMIT_OPTIONS = [
  {description: "1 day", value: 1 * DAYS},
  {description: "1 week", value: 7 * DAYS},
  {description: "1 month", value: 30 * DAYS},
  {description: "3 months", value: 90 * DAYS},
  {description: "1 year", value: 365 * DAYS},
];

export const get = async (): Promise<Options> => ({
  ...DEFAULT_OPTIONS,
  ...(await browser.storage.sync.get(OPTIONS_STORAGE_KEYS)),
});

export const set = (newOptions: Options): Promise<void> =>
  browser.storage.sync.set(newOptions);
