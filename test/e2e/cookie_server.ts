import * as http from "http";
import * as util from "util";
import {findFreeTcpPort} from "../vendor/web-ext/src/firefox/remote";

import newCookieServer from "./cookie-server/server";

export const start = async (): Promise<[string, http.Server]> => {
  const server = newCookieServer();
  const port = await findFreeTcpPort();
  await util.promisify(server.listen.bind(server, port))();
  const url = `http://localhost:${port}`;
  return [url, server];
};

export const stop = async (server: http.Server | undefined): Promise<void> => {
  if (server) {
    await util.promisify(server.close.bind(server))();
  }
};
