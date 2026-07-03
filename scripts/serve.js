#!/usr/bin/env node
// Zero-dependency static file server for previewing dist/ locally.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 4000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function resolvePath(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let full = path.join(ROOT, p);
  if (!full.startsWith(ROOT)) return null; // path traversal guard
  return full;
}

const server = http.createServer((req, res) => {
  let full = resolvePath(req.url);
  if (!full) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      const notFound = path.join(ROOT, '404.html');
      return fs.readFile(notFound, (e2, data2) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(e2 ? 'Not found' : data2);
      });
    }
    const ext = path.extname(full);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serving dist/ at http://localhost:${PORT}`);
});
