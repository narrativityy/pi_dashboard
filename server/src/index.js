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
const setupTerminal = require('./terminal');
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

// Attach WebSocket terminal to the HTTP server
setupTerminal(server);

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
