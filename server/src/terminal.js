const pty = require('node-pty');
const jwt = require('jsonwebtoken');
const { COOKIE_NAME } = require('./auth');

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}

function setupTerminal(wss) {

  wss.on('connection', (ws, req) => {
    // Auth check — verify JWT cookie before spawning a shell
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_NAME];

    if (!token) {
      ws.close(4001, 'Not authenticated');
      return;
    }

    try {
      jwt.verify(token, process.env.SESSION_SECRET);
    } catch {
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    // Spawn shell
    const shell = process.env.SHELL || '/bin/bash';
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: process.env,
    });

    ptyProcess.onData((data) => {
      if (ws.readyState === ws.OPEN) ws.send(data);
    });

    ptyProcess.onExit(() => {
      if (ws.readyState === ws.OPEN) ws.close();
    });

    ws.on('message', (msg) => {
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === 'resize') {
          ptyProcess.resize(parsed.cols, parsed.rows);
        } else if (parsed.type === 'input') {
          ptyProcess.write(parsed.data);
        }
      } catch {
        // plain string input (fallback)
        ptyProcess.write(msg);
      }
    });

    ws.on('close', () => ptyProcess.kill());
  });
}

module.exports = setupTerminal;
