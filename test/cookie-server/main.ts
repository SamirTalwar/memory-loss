import newServer from "./server.js";

const port = process.env["PORT"] ? parseInt(process.env["PORT"]) : 8080;

const server = newServer();
server.listen(port, () => {
  console.log(`Listening on port ${port}.`);
  process.on("SIGINT", () => server.close());
  process.on("SIGTERM", () => server.close());
});
