#!/usr/bin/env node
'use strict';

/**
 * 33-js-concepts documentation preview server.
 *
 * This repository is a static documentation project (a Chinese guide to 33
 * JavaScript concepts). It has no build system, so the "application" is a
 * live preview of README.md. The server uses only Node.js built-ins: it
 * serves the repository files statically and renders README.md to HTML in the
 * browser via marked + github-markdown-css loaded from a CDN.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>33 JS Concepts - Documentation Preview</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/github-markdown-css@5/github-markdown-light.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/styles/github.min.css" />
  <style>
    body { margin: 0; background: #fff; }
    .markdown-body {
      box-sizing: border-box;
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px 80px;
    }
    #status { color: #57606a; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <article id="content" class="markdown-body">
    <p id="status">Loading README.md…</p>
  </article>
  <script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/highlight.min.js"></script>
  <script>
    (async () => {
      const content = document.getElementById('content');
      try {
        const res = await fetch('/README.md', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const md = await res.text();
        marked.setOptions({ gfm: true, breaks: false });
        content.innerHTML = marked.parse(md);
        if (window.hljs) {
          document.querySelectorAll('pre code').forEach((el) => window.hljs.highlightElement(el));
        }
        document.title = (content.querySelector('h1')?.textContent || '33 JS Concepts').trim();
      } catch (err) {
        content.innerHTML = '<p style="color:#cf222e">Failed to load README.md: ' + err.message + '</p>';
      }
    })();
  </script>
</body>
</html>
`;

function sendError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch {
    return sendError(res, 400, 'Bad request');
  }

  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
    return res.end(INDEX_HTML);
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT + path.sep)) {
    return sendError(res, 403, 'Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return sendError(res, 404, 'Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Content-Length': stats.size,
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Documentation preview server running at http://${HOST}:${PORT}/`);
  console.log(`Serving files from ${ROOT}`);
});
