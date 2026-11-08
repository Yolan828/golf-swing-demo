// Serves the static export the way nginx.conf does: file, then file.html, then 404.

import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'out');
const port = Number(process.env.PORT) || 4173;

const contentTypes = {
  '.css': 'text/css',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function resolveFile(urlPath) {
  const relative = path.normalize(decodeURIComponent(urlPath)).replace(/^([\\/]|\.\.[\\/])+/, '');
  const base = path.join(outDir, relative);
  const candidates = [base, `${base}.html`, path.join(base, 'index.html')];
  return candidates.find((file) => file.startsWith(outDir) && fs.existsSync(file) && fs.statSync(file).isFile());
}

http
  .createServer((request, response) => {
    const file = resolveFile(new URL(request.url, 'http://localhost').pathname);
    if (!file) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(response);
  })
  .listen(port, () => console.log(`Serving out/ on http://localhost:${port}`));
