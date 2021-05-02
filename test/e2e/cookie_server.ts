import * as http from "http";
import * as util from "util";

import newCookieServer from "./cookie-server/server";

export const start = async (): Promise<http.Server> => {
  const server = newCookieServer();
  await util.promisify(server.listen.bind(server, 0))();
  return server;
};

export const stop = async (server: http.Server | undefined): Promise<void> => {
  if (server) {
    await util.promisify(server.close.bind(server))();
  }
};
