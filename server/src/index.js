require('dotenv').config();
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const authRouter = require('./auth');
const statsRouter = require('./stats');
const servicesRouter = require('./services');
const systemRouter = require('./system');
const processesRouter = require('./processes');
const wifiRouter = require('./wifi');
const filesRouter = require('./files');
const { WebSocketServer } = require('ws');
const setupTerminal = require('./terminal');
const setupStatsWs = require('./statsWs');
const startCollector = require('./collector');
const { requireAuth } = require('./middleware');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: IS_PROD ? false : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/stats', requireAuth, statsRouter);
app.use('/api/services', requireAuth, servicesRouter);
app.use('/api/system', requireAuth, systemRouter);
app.use('/api/processes', requireAuth, processesRouter);
app.use('/api/wifi', requireAuth, wifiRouter);
app.use('/api/files', requireAuth, filesRouter);

// Attach WebSockets — use noServer + manual upgrade routing so both
// paths can coexist on the same HTTP server without handler conflicts.
const terminalWss = new WebSocketServer({ noServer: true });
const statsWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (pathname === '/ws/terminal') {
    terminalWss.handleUpgrade(req, socket, head, (ws) => terminalWss.emit('connection', ws, req));
  } else if (pathname === '/ws/stats') {
    statsWss.handleUpgrade(req, socket, head, (ws) => statsWss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

setupTerminal(terminalWss);
setupStatsWs(statsWss);

// In production, serve the built React app
if (IS_PROD) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  startCollector();
});
