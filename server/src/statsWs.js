const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');
const { COOKIE_NAME } = require('./auth');
const { getLiveStats } = require('./stats');

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k, v.join('=')];
    })
  );
}

function setupStatsWs(server) {
  const wss = new WebSocketServer({ server, path: '/ws/stats' });
  const clients = new Set();
  let interval = null;

  function startBroadcast() {
    if (interval) return;
    interval = setInterval(async () => {
      if (clients.size === 0) {
        clearInterval(interval);
        interval = null;
        return;
      }
      try {
        const stats = await getLiveStats();
        const msg = JSON.stringify(stats);
        for (const ws of clients) {
          if (ws.readyState === ws.OPEN) ws.send(msg);
        }
      } catch {
        // non-fatal — next tick will retry
      }
    }, 3000);
  }

  wss.on('connection', (ws, req) => {
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[COOKIE_NAME];

    if (!token) { ws.close(4001, 'Not authenticated'); return; }
    try {
      jwt.verify(token, process.env.SESSION_SECRET);
    } catch {
      ws.close(4001, 'Invalid or expired token'); return;
    }

    clients.add(ws);
    startBroadcast();

    // Send current stats immediately on connect
    getLiveStats()
      .then((stats) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(stats)); })
      .catch(() => {});

    ws.on('close', () => clients.delete(ws));
  });
}

module.exports = setupStatsWs;
