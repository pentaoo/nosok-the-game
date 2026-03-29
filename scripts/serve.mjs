import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".glb", "model/gltf-binary"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".woff2", "font/woff2"],
]);

function getMimeType(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

async function resolveRequestPath(urlPathname) {
  const normalizedPath = decodeURIComponent(urlPathname.split("?")[0]);
  const relativePath = normalizedPath === "/" ? "index.html" : normalizedPath.replace(/^\/+/, "");
  const absolutePath = path.resolve(rootDir, relativePath);

  if (!absolutePath.startsWith(rootDir)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }

  let fileStats;
  try {
    fileStats = await stat(absolutePath);
  } catch {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }

  if (fileStats.isDirectory()) {
    const indexPath = path.join(absolutePath, "index.html");
    await access(indexPath);
    return indexPath;
  }

  return absolutePath;
}

const server = http.createServer(async (req, res) => {
  try {
    const filePath = await resolveRequestPath(req.url || "/");
    res.writeHead(200, {
      "Content-Type": getMimeType(filePath),
      "Cache-Control": "no-cache",
    });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(statusCode === 404 ? "Not found" : "Server error");
  }
});

server.listen(port, host, () => {
  console.log(`Static server running at http://${host}:${port}`);
});
