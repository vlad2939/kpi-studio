import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'dist');
const preferredPort = Number(process.env.PORT || 5174);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
    const relativePath = safePath === '/' ? 'index.html' : safePath.replace(/^[/\\]/, '');
    let filePath = join(distRoot, relativePath);
    let body;
    try {
      body = await readFile(filePath);
    } catch {
      try {
        filePath = join(projectRoot, relativePath);
        body = await readFile(filePath);
      } catch {
        filePath = join(distRoot, 'index.html');
        body = await readFile(filePath);
      }
    }
    response.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

function listen(port) {
  server.listen(port, '127.0.0.1');
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && server.requestedPort < preferredPort + 20) {
    const nextPort = server.requestedPort + 1;
    console.log(`Portul ${server.requestedPort} este deja folosit. Incerc portul ${nextPort}...`);
    listen(nextPort);
    return;
  }
  if (error.code === 'EADDRINUSE') {
    console.error(`Porturile ${preferredPort}-${preferredPort + 20} sunt deja folosite. Inchide ferestrele vechi KPI Studio si incearca din nou.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.on('listening', () => {
  const address = server.address();
  const activePort = typeof address === 'object' && address ? address.port : preferredPort;
  const url = `http://127.0.0.1:${activePort}/`;
  console.log(`KPI Studio ruleaza la ${url}`);
  if (process.env.OPEN_BROWSER === '1') {
    exec(`start "" "${url}"`);
  }
});

server.requestedPort = preferredPort;
const originalListen = server.listen.bind(server);
server.listen = (port, ...args) => {
  server.requestedPort = Number(port);
  return originalListen(port, ...args);
};

listen(preferredPort);
