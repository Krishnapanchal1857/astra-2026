// Local development server: serves /public and routes /api/* to the same handler Vercel uses.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handle } from "./lib/router.js";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "public");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".ico": "image/x-icon", ".zip": "application/zip" };
// Same clean URLs as vercel.json
const REWRITES = { "/": "/index.html", "/events": "/event.html", "/login": "/login.html", "/contact": "/contact.html", "/register": "/register.html" };

http.createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.startsWith("/api/")) return handle(req, res);
  const rel = REWRITES[path] || path;
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) { res.statusCode = 403; return res.end("Forbidden"); }
  try {
    const data = await readFile(file);
    res.setHeader("Content-Type", MIME[extname(file).toLowerCase()] || "application/octet-stream");
    res.setHeader("Accept-Ranges", "bytes");               // video seeking (scroll animation) needs Range support
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
    if (m) {
      const start = m[1] === "" ? Math.max(0, data.length - Number(m[2])) : Number(m[1]);
      const end = m[1] === "" || m[2] === "" ? data.length - 1 : Math.min(Number(m[2]), data.length - 1);
      if (start > end || start >= data.length) { res.statusCode = 416; res.setHeader("Content-Range", `bytes */${data.length}`); return res.end(); }
      res.statusCode = 206; res.setHeader("Content-Range", `bytes ${start}-${end}/${data.length}`); res.setHeader("Content-Length", end - start + 1);
      return res.end(data.subarray(start, end + 1));
    }
    res.setHeader("Content-Length", data.length);
    res.end(data);
  } catch { res.statusCode = 404; res.end("Not found"); }
}).listen(process.env.PORT || 3000, () => console.log(`ASTRA running at http://localhost:${process.env.PORT || 3000}`));
