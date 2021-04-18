import * as http from "http";
import * as stream from "stream";

const page = (cookies: [string, string][]): string => `
<!DOCTYPE html>
<html>
  <head>
    <title>Cookies</title>
    <meta charset="utf-8"/>
  </head>
  <body>
    <h1>Cookies</h1>

    <h2>Current Cookies</h2>
    <ul id="cookies">
    ${cookies
      .map(
        ([name, value]) =>
          `<li><span class="cookie-name">${name}</span>: <span class="cookie-value">${value}</span></li>`,
      )
      .join("")}
    </ul>

    <h2>New Cookie</h2>
    <form id="new" method="post" action="/set">
      <p>
        <label for="new-cookie">Set-Cookie header:</label>
        <input name="new-cookie" size="64"/>
      </p>
      <p>
        <input id="submit-new-cookie" type="submit" value="Create"/>
      </p>
    </form>
  </body>
</html>
`;

const consume = (input: stream.Readable): Promise<string> =>
  new Promise((resolve, reject) => {
    input.setEncoding("utf-8");
    let body = "";
    input.on("data", (chunk) => {
      body += chunk;
    });
    input.on("end", () => {
      resolve(body);
    });
    input.on("error", (error) => {
      reject(error);
    });
  });

const splitCookie = (cookieString: string): [string, string] => {
  const offset = cookieString.indexOf("=");
  if (offset < 0) {
    throw new Error(`Invalid cookie header: ${cookieString}`);
  } else {
    return [
      cookieString.substring(0, offset),
      cookieString.substring(offset + 1),
    ];
  }
};

export default (): http.Server =>
  http.createServer(async (request, response) => {
    try {
      switch (request.method) {
        case "GET":
          switch (request.url) {
            case "/":
              const cookies = request.headers["cookie"]
                ? request.headers["cookie"].split(/;\s+/).map(splitCookie)
                : [];
              response.setHeader("Content-Type", "text/html");
              response.write(page(cookies));
              response.end();
              return;
          }
          break;
        case "POST":
          switch (request.url) {
            case "/set":
              const body = await consume(request);
              const result = /^new-cookie=(.*)$/.exec(body);
              if (!result) {
                response.writeHead(400);
                response.write("Invalid form submission.");
                response.end();
                return;
              }
              const setCookieHeader = result[1];
              if (!setCookieHeader) {
                response.writeHead(400);
                response.write("Invalid form submission.");
                response.end();
                return;
              }
              const headers = {
                "Set-Cookie": decodeURIComponent(
                  setCookieHeader.replace(/\+/g, " "),
                ),
                Location: "/",
              };
              response.writeHead(303, headers);
              response.end();
              return;
          }
          break;
      }

      response.writeHead(404);
      response.write("Not Found");
      response.end();
    } catch (error) {
      console.error(error);
      response.writeHead(500);
      response.write(`Error:\n${error}`);
      response.end();
    }
  });
