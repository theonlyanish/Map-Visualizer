const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 5173);
const ROOT = __dirname;
const SITE_URL = process.env.SITE_URL || "";
const GITHUB_EVENTS_URL = "https://api.github.com/events?per_page=100";
const INDEX_PATH = path.join(ROOT, "index.html");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function send(response, status, body, headers = {}) {
  response.writeHead(status, headers);
  response.end(body);
}

function logApi(...args) {
  console.log("[Starfall API]", ...args);
}

function warnApi(...args) {
  console.warn("[Starfall API]", ...args);
}

function getSiteOrigin(request) {
  if (SITE_URL) {
    return SITE_URL.replace(/\/+$/, "");
  }

  const forwardedProto = request.headers["x-forwarded-proto"];
  const forwardedHost = request.headers["x-forwarded-host"];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || "").split(",")[0].trim()
    || (request.socket.encrypted ? "https" : "http");
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost || "").split(",")[0].trim()
    || request.headers.host
    || `localhost:${PORT}`;

  return `${protocol}://${host}`.replace(/\/+$/, "");
}

function renderIndexHtml(request, response) {
  fs.readFile(INDEX_PATH, "utf8", (error, html) => {
    if (error) {
      send(response, 500, "Unable to load homepage", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    const siteOrigin = getSiteOrigin(request);
    const renderedHtml = html.replaceAll("__SITE_ORIGIN__", siteOrigin);

    send(response, 200, renderedHtml, {
      "Content-Type": mimeTypes[".html"],
      "Cache-Control": "no-store",
    });
  });
}

function serveRobots(request, response) {
  const siteOrigin = getSiteOrigin(request);
  const body = [`User-agent: *`, `Allow: /`, ``, `Sitemap: ${siteOrigin}/sitemap.xml`].join("\n");
  send(response, 200, body, {
    "Content-Type": mimeTypes[".txt"],
    "Cache-Control": "public, max-age=3600",
  });
}

function serveSitemap(request, response) {
  const siteOrigin = getSiteOrigin(request);
  const lastModified = fs.existsSync(INDEX_PATH) ? fs.statSync(INDEX_PATH).mtime.toISOString() : new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteOrigin}/</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  send(response, 200, body, {
    "Content-Type": mimeTypes[".xml"],
    "Cache-Control": "public, max-age=3600",
  });
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
    const rateLimitRemaining = upstream.headers.get("x-ratelimit-remaining");
    const rateLimitReset = upstream.headers.get("x-ratelimit-reset");
    const pollInterval = upstream.headers.get("x-poll-interval");
    logApi("proxy upstream response", {
      status: upstream.status,
      ok: upstream.ok,
      rateLimitRemaining,
      rateLimitReset,
      pollInterval,
      bodyPreview: upstream.ok || upstream.status === 304 ? "" : body.slice(0, 180),
    });

    const responseHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    };

    const contentType = upstream.headers.get("content-type");
    const etag = upstream.headers.get("etag");
    if (contentType) responseHeaders["Content-Type"] = contentType;
    if (etag) responseHeaders.Etag = etag;
    if (pollInterval) responseHeaders["X-Poll-Interval"] = pollInterval;
    responseHeaders["X-Starfall-Source"] = "live";

    if (!upstream.ok && upstream.status !== 304) {
      warnApi("proxy falling back to demo", {
        upstreamStatus: upstream.status,
        rateLimitRemaining,
        rateLimitReset,
      });
      send(response, 200, "[]", {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Poll-Interval": "90",
        "X-Starfall-Source": "demo",
      });
      return;
    }

    send(response, upstream.status, body, responseHeaders);
  } catch (error) {
    warnApi("proxy fetch failed, falling back to demo", {
      message: error.message,
      stack: error.stack,
    });
    send(
      response,
      200,
      "[]",
      {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Poll-Interval": "90",
        "X-Starfall-Source": "demo",
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

  if (path.resolve(filePath) === path.resolve(INDEX_PATH)) {
    renderIndexHtml(request, response);
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

  if (request.url.startsWith("/robots.txt")) {
    serveRobots(request, response);
    return;
  }

  if (request.url.startsWith("/sitemap.xml")) {
    serveSitemap(request, response);
    return;
  }

  serveStatic(request, response);
});

server.listen(PORT, () => {
  console.log(`Starfall Atlas running at http://localhost:${PORT}`);
});
