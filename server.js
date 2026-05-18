import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const port = Number.parseInt(process.env.PORT || "3000", 10);
const apiBaseUrl = (
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.PUBLIC_API_URL ||
  "http://localhost:10000"
).replace(/\/+$/, "");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".html": "text/html; charset=utf-8",
};

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

function safeJoin(root, requestedPath) {
  const normalized = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(root, normalized);
  return fullPath.startsWith(root) ? fullPath : root;
}

async function serveAsset(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || "application/octet-stream";
  const content = await fs.readFile(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=3600",
  });
  res.end(content);
}

async function serveIndex(res) {
  const template = await fs.readFile(path.join(publicDir, "index.html"), "utf8");
  const html = template.replaceAll("__API_BASE_URL__", apiBaseUrl);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const assetPath = safeJoin(publicDir, pathname === "/" ? "/index.html" : pathname);
    if (await fileExists(assetPath) && path.extname(assetPath)) {
      await serveAsset(res, assetPath);
      return;
    }

    await serveIndex(res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error?.message || "Internal server error" }));
  }
});

server.listen(port, () => {
  console.log(`Public site running on port ${port}`);
});
