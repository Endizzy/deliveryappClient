// Минимальный статический сервер для продакшна (Railway).
// Отдаёт собранный Vite-билд из ./dist с правильным Content-Type
// и SPA-fallback на index.html. Без внешних зависимостей (только Node).

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = process.env.PORT || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function serveIndex(res) {
  fs.readFile(path.join(DIST, "index.html"), (err, html) => {
    if (err) return send(res, 404, "Not found");
    send(res, 200, html, { "Content-Type": "text/html; charset=utf-8" });
  });
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.normalize(path.join(DIST, urlPath));

    // защита от выхода за пределы dist
    if (!filePath.startsWith(DIST)) return send(res, 403, "Forbidden");

    fs.stat(filePath, (err, stat) => {
      if (err) return serveIndex(res); // нет файла → SPA-fallback
      if (stat.isDirectory()) filePath = path.join(filePath, "index.html");

      fs.readFile(filePath, (err2, data) => {
        if (err2) return serveIndex(res);
        const ext = path.extname(filePath).toLowerCase();
        const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
        // хэшированные ассеты Vite можно кэшировать надолго
        if (urlPath.startsWith("/assets/")) {
          headers["Cache-Control"] = "public, max-age=31536000, immutable";
        }
        send(res, 200, data, headers);
      });
    });
  } catch (e) {
    send(res, 500, "Server error");
  }
});

server.listen(PORT, () => {
  console.log(`Static server serving ${DIST} on port ${PORT}`);
});
