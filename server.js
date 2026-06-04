/* =========================================================
   Tú Iglesia — Servidor estático (sin dependencias)
   Sirve los archivos del sitio. Railway le pasa el puerto
   por la variable de entorno PORT.
   ========================================================= */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const safePath = path.normalize(path.join(ROOT, urlPath));

  // Protección básica contra path traversal
  if (!safePath.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Prohibido");
    return;
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1><p>Página no encontrada. <a href='/'>Volver al inicio</a></p>");
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    // HTML/CSS/JS siempre frescos (para que los cambios se vean al instante).
    // Imágenes y fuentes se cachean un día.
    const noCache = [".html", ".css", ".js", ".json"];
    const cacheControl = noCache.includes(ext)
      ? "no-cache"
      : "public, max-age=86400";
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": cacheControl,
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Tú Iglesia corriendo en el puerto ${PORT}`);
});
