const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 5173);
const ROOT = __dirname;
const GITHUB_EVENTS_URL = "https://api.github.com/events?per_page=100";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, headers);
  response.end(body);
}

async function proxyGithubEvents(request, response) {
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "starfall-atlas-local",
    };
    if (request.headers["if-none-match"]) {
      headers["If-None-Match"] = request.headers["if-none-match"];
    }

    const upstream = await fetch(GITHUB_EVENTS_URL, { headers });
    const body = upstream.status === 304 ? "" : await upstream.text();
    const responseHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    };

    const contentType = upstream.headers.get("content-type");
    const etag = upstream.headers.get("etag");
    const pollInterval = upstream.headers.get("x-poll-interval");
    if (contentType) responseHeaders["Content-Type"] = contentType;
    if (etag) responseHeaders.Etag = etag;
    if (pollInterval) responseHeaders["X-Poll-Interval"] = pollInterval;
    responseHeaders["X-Starfall-Source"] = "proxy";

    if (!upstream.ok && upstream.status !== 304) {
      send(response, 200, "[]", {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Poll-Interval": "90",
        "X-Starfall-Source": "local",
      });
      return;
    }

    send(response, upstream.status, body, responseHeaders);
  } catch (error) {
    send(
      response,
      200,
      "[]",
      {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Poll-Interval": "90",
        "X-Starfall-Source": "local",
      },
    );
  }
}

function serveStatic(request, response) {
  const requestPath = decodeURIComponent(new URL(request.url, `http://localhost:${PORT}`).pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const safePath = path.normalize(relativePath);
  if (safePath.startsWith("..") || path.isAbsolute(safePath)) {
    send(response, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    send(response, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(response, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    send(response, 200, data, { "Content-Type": contentType });
  });
}

const server = http.createServer((request, response) => {
  if (request.url.startsWith("/api/github-events")) {
    proxyGithubEvents(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(PORT, () => {
  console.log(`Starfall Atlas running at http://localhost:${PORT}`);
});
