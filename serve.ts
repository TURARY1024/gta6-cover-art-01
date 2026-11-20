// Leonida Cover Lab — dev server. Serves app/ at http://localhost:8080.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "app");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

const port = Number(process.env.PORT ?? 8080);
createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (path !== root && !path.startsWith(root + sep)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  if (existsSync(path) && statSync(path).isDirectory()) {
    path = join(path, "index.html");
  }
  if (!existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": types[extname(path).toLowerCase()] ?? "application/octet-stream" });
  res.end(readFileSync(path));
}).listen(port, () => {
  console.log(`Leonida Cover Lab at http://localhost:${port}`);
});
