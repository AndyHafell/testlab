/* Tiny zero-dependency static server for IDEA SWIPE.
   Usage: node server.js  →  http://localhost:5173 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Bad request');
    return;
  }
  if (pathname === '/') pathname = '/index.html';

  const file = path.normalize(path.join(ROOT, pathname));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }).end(data);
  });
}).listen(PORT, () => {
  console.log(`IDEA SWIPE running → http://localhost:${PORT}`);
});
