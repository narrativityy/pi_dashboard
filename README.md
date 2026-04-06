# Pi Dashboard

A self-hosted web dashboard for Raspberry Pi devices. Provides a browser-based interface for monitoring system health and accessing a live terminal — accessible from any device on your local network.

## Features

- **Login** — session-gated access via username/password
- **System Dashboard** — real-time CPU temperature, clock speeds, CPU/memory/disk usage, uptime, and more
- **Web Terminal** — a full in-browser terminal session powered by xterm.js and node-pty

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js, Express |
| Terminal | node-pty + WebSockets (ws) |
| System Stats | systeminformation |
| Auth (MVP) | Static credentials via environment variable |
| Auth (future) | PAM — authenticate against real Linux users on the host device |

## Project Structure

```
pi_dashboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Dashboard.jsx
│   │   └── components/
│   │       ├── SystemStats.jsx
│   │       └── Terminal.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── index.js        # Entry point, Express + WebSocket server
│   │   ├── auth.js         # Login route + session handling
│   │   ├── stats.js        # System metrics API routes
│   │   └── terminal.js     # node-pty WebSocket handler
│   └── package.json
├── start.sh                # Manual start script (starts both client and server)
└── README.md
```

## Authentication

### MVP
Credentials are set via environment variables. The login page accepts a username and password, which are checked against these values server-side. A session token is issued on success and required for all subsequent API calls and the WebSocket terminal connection.

```bash
DASHBOARD_USER=admin
DASHBOARD_PASS=yourpassword
```

### Future: PAM Authentication
The goal is to support real Linux user authentication using the host device's PAM stack. This means any user account on the Pi can log in with their actual system password — no configuration needed. This makes the project portable: anyone can clone it, run it, and sign in with their existing Linux credentials.

This will be implemented using the `authenticate-pam` Node.js package, which wraps the system's PAM libraries. Requires the server process to run with sufficient privileges (or a small setuid helper) to authenticate against `/etc/shadow`.

> **Note:** Even with PAM auth enabled, this login only gates access to the dashboard. It does not create a process running as that user — the terminal session still runs as the user that started the server process.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Raspberry Pi running Linux (tested on Pi Zero 2W, Pi 4)

### Install

```bash
git clone <repo-url> pi_dashboard
cd pi_dashboard

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Configure

Create a `.env` file in `server/`:

```
DASHBOARD_USER=admin
DASHBOARD_PASS=yourpassword
SESSION_SECRET=changeme
PORT=3001
```

### Run (Development)

```bash
# From the project root
./start.sh
```

The frontend dev server runs on `http://localhost:5173` and the backend API on `http://localhost:3001`. Access the dashboard from any device on your local network using your Pi's IP address.

### Run (Production)

Build the frontend and serve it statically from the backend:

```bash
cd client && npm run build
```

Then configure the server to serve `client/dist/` and run:

```bash
cd server && node src/index.js
```

The entire app is then available on a single port (default: `3001`).

## Auto-start on Boot (systemd)

To have the dashboard start automatically when the Pi boots:

1. Copy the example service file:
   ```bash
   sudo cp pi-dashboard.service /etc/systemd/system/
   ```
2. Edit it to match your install path and user.
3. Enable and start the service:
   ```bash
   sudo systemctl enable pi-dashboard
   sudo systemctl start pi-dashboard
   ```

## Roadmap

- [x] Project structure and planning
- [ ] Backend: Express server + session auth (MVP static credentials)
- [ ] Backend: System stats API (`/api/stats`)
- [ ] Backend: WebSocket terminal handler (node-pty)
- [ ] Frontend: Login page
- [ ] Frontend: Dashboard with live system stats
- [ ] Frontend: Terminal page (xterm.js)
- [ ] Production build + single-port serving
- [ ] systemd service file
- [ ] PAM authentication support
- [ ] Multi-session terminal support
