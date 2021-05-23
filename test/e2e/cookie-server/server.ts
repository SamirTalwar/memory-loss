import * as http from "http";
import * as stream from "stream";

interface Cookie {
  name: string;
  value: string;
}

const blankGif = Buffer.from(
  "47494638396101000100800000ffffff00000021f90400000000002c00000000010001000002024401003b",
  "hex",
);

const page = (
  cookies: Cookie[],
  thirdPartyDomain: string | null = null,
): string => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Cookies</title>
  </head>
  <body>
    <h1>Cookies</h1>

    <h2>Current Cookies</h2>
    <ul id="cookies">
    ${cookies
      .map(
        ({name, value}) =>
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

    ${
      thirdPartyDomain
        ? `
    <h2>Current Third-Party Cookies</h2>
    <ul id="third-party-cookies">
    </ul>

    <h2>New Third-Party Cookie</h2>
    <form id="new-third-party" method="post">
      <p>
        <label for="new-third-party-cookie">Set-Cookie header:</label>
        <input name="new-third-party-cookie" size="64"/>
      </p>
      <p>
        <input id="submit-new-third-party-cookie" type="submit" value="Create"/>
      </p>
    </form>
    <script>
      const loadThirdPartyCookies = async () => {
        try {
          const response = await fetch("${thirdPartyDomain}/third-party-cookies.json", {
            mode: "cors",
            credentials: "include",
          });
          const responseData = await response.json();
          const thirdPartyCookiesList = document.getElementById("third-party-cookies");
          while (thirdPartyCookiesList.childElementCount > 0) {
            thirdPartyCookiesList.childNodes[0].remove();
          }
          for (const {name, value} of responseData.cookies) {
            const cookieName = document.createElement("span");
            cookieName.className = "cookie-name";
            cookieName.textContent = name;
            const cookieValue = document.createElement("span");
            cookieValue.className = "cookie-value";
            cookieValue.textContent = value;
            const li = document.createElement("li");
            li.appendChild(cookieName);
            li.appendChild(document.createTextNode(": "));
            li.appendChild(cookieValue);
            thirdPartyCookiesList.appendChild(li);
          }
        } catch (error) {
          console.error("Could not load the third-party cookies.", error);
        }
      };

      loadThirdPartyCookies();

      document.getElementById("new-third-party").addEventListener("submit", async event => {
        event.preventDefault();
        try {
          const image = document.createElement("img");
          const setCookieHeader = document.querySelector("[name=new-third-party-cookie]").value;
          image.src = "${thirdPartyDomain}/third-party-image.gif?setCookieHeader=" + encodeURIComponent(setCookieHeader);
          document.body.appendChild(image);
          await new Promise(resolve => setTimeout(resolve, 100));
          await loadThirdPartyCookies();
        } catch (error) {
          console.error("Could not submit a new third-party cookie.", error);
        }
      });
    </script>
    `
        : ""
    }
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

const parseCookieHeader = (cookieHeader: string | undefined): Cookie[] =>
  cookieHeader
    ? cookieHeader.split(/;\s+/).map((cookie) => {
        const [name, value] = splitCookie(cookie);
        return {name, value};
      })
    : [];

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
      const url = new URL(request.url!, "http://localhost/");
      switch (request.method) {
        case "GET":
          switch (url.pathname) {
            case "/": {
              const thirdPartyDomain = url.searchParams.get("thirdPartyDomain");
              const cookies = parseCookieHeader(request.headers["cookie"]);
              response.setHeader("Content-Type", "text/html");
              response.write(page(cookies, thirdPartyDomain));
              response.end();
              return;
            }
            case "/third-party-cookies.json": {
              const cookies = parseCookieHeader(request.headers["cookie"]);
              response.writeHead(200, {
                "Access-Control-Allow-Origin": request.headers["origin"] || "*",
                "Access-Control-Allow-Credentials": "true",
                "Content-Type": "application/json",
              });
              response.write(JSON.stringify({cookies}));
              response.end();
              return;
            }
            case "/third-party-image.gif": {
              const setCookieHeader = url.searchParams.get("setCookieHeader");
              if (!setCookieHeader) {
                response.writeHead(400);
                response.write("Invalid form submission.");
                response.end();
                return;
              }
              response.writeHead(200, {
                "Access-Control-Allow-Origin": "*",
                "Set-Cookie": decodeURIComponent(
                  setCookieHeader.replace(/\+/g, " "),
                ),
              });
              response.write(blankGif);
              response.end();
              return;
            }
          }
          break;
        case "POST":
          switch (request.url) {
            case "/set": {
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
          }
          break;
        case "OPTIONS": {
          response.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
          });
          response.end();
        }
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
