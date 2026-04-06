# Pi Dashboard

A self-hosted web dashboard for Raspberry Pi devices. Monitor system health and access a live terminal from any browser on your local network.

## Features

- **Login** — session-gated access via username/password
- **System Dashboard** — real-time CPU load, temperature, clock speed, memory, disk usage, and uptime (updates every 3 seconds)
- **Web Terminal** — full in-browser terminal session *(coming soon)*

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js, Express 4 |
| Terminal | node-pty + WebSockets (ws) *(coming soon)* |
| System Stats | systeminformation |
| Auth (MVP) | Static credentials via `.env` + JWT httpOnly cookie |
| Auth (future) | PAM — authenticate against real Linux users on the host |

## Project Structure

```
pi_dashboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js              # fetch wrappers for all API calls
│   │   ├── index.css
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   └── Dashboard.jsx
│   │   └── components/
│   │       ├── ProtectedRoute.jsx
│   │       └── Terminal.jsx        # (coming soon)
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── index.js        # Express entry point
│   │   ├── auth.js         # /api/auth routes + JWT logic
│   │   ├── middleware.js   # requireAuth middleware
│   │   ├── stats.js        # /api/stats route
│   │   └── terminal.js     # node-pty WebSocket handler (coming soon)
│   ├── .env                # credentials — do not commit
│   └── package.json
├── start.sh                # production start script
├── pi-dashboard.service    # systemd unit file
└── README.md
```

## Authentication

Credentials are set in `server/.env`. On login the server issues a signed JWT stored as an httpOnly cookie — it's required for all API calls and the terminal WebSocket connection.

```
DASHBOARD_USER=youruser
DASHBOARD_PASS=yourpassword
SESSION_SECRET=a-long-random-string
PORT=3001
```

> **Future:** PAM authentication via `authenticate-pam` so any Linux user account on the host can log in with their system password. The login still only gates dashboard access — the terminal runs as whichever user started the server.

## Getting Started

### Prerequisites

**System packages**

The default Raspberry Pi OS repos ship an outdated version of Node.js. Install via NodeSource to get 18+:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Everything else you need:

```bash
sudo apt install -y git build-essential python3
```

| Package | Why |
|---|---|
| `nodejs` (22 LTS) | runtime for the server |
| `npm` | comes bundled with Node.js |
| `git` | clone the repo |
| `build-essential` | compiles native modules (needed for the terminal feature) |
| `python3` | required by node-gyp for native module compilation |

> The dashboard and stats features work without `build-essential` and `python3`. You only need those when adding the web terminal (node-pty requires a native compile step).

### Install

```bash
git clone <repo-url> pi_dashboard
cd pi_dashboard/server && npm install
cd ../client && npm install
```

### Configure

```bash
cp server/.env.example server/.env
# edit server/.env with your credentials
```

Or create `server/.env` manually:

```
DASHBOARD_USER=youruser
DASHBOARD_PASS=yourpassword
SESSION_SECRET=a-long-random-string
PORT=3001
```

### Development

Runs the frontend (port 5173) and backend (port 3001) separately. Vite proxies `/api` requests to the backend so there are no CORS issues.

```bash
# from project root
npm run dev
```

Or individually:
```bash
npm run dev:client
npm run dev:server
```

### Production (on the Pi)

`start.sh` builds the React app and starts the server in production mode. Everything is served from a single port.

```bash
./start.sh
```

Then open `http://<pi-ip>:3001` from any device on your network.

### Auto-start on Boot

The service file assumes the following — edit `pi-dashboard.service` if anything differs:

| Field | Default value |
|---|---|
| `User` | `pi` |
| `WorkingDirectory` | `/home/pi/Documents/pi_dashboard/server` |
| `ExecStart` | `/usr/local/bin/node src/index.js` |

Verify your node path with `which node` before copying.

```bash
# confirm node path
which node

# copy and enable
sudo cp pi-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pi-dashboard
sudo systemctl start pi-dashboard
```

Check status with:
```bash
sudo systemctl status pi-dashboard
```

### Auto-update

The Pi can automatically check for new commits and rebuild every 5 minutes using a systemd timer.

```bash
sudo cp pi-dashboard-update.service /etc/systemd/system/
sudo cp pi-dashboard-update.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pi-dashboard-update.timer
sudo systemctl start pi-dashboard-update.timer
```

Check timer status and when it last ran:
```bash
sudo systemctl status pi-dashboard-update.timer
sudo journalctl -u pi-dashboard-update.service -n 20 --no-pager
```

To trigger an update manually at any time:
```bash
cd ~/Documents/pi_dashboard && ./update.sh
```

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Log in, sets JWT cookie |
| POST | `/api/auth/logout` | — | Clears JWT cookie |
| GET | `/api/auth/verify` | — | Check if session is valid |
| GET | `/api/stats` | required | System metrics snapshot |

## Roadmap

- [x] Project structure
- [x] Auth — JWT httpOnly cookie, login/logout/verify
- [x] Stats API — CPU, temperature, memory, disk, uptime
- [x] Dashboard UI — live stat cards, 3s polling
- [x] Production build — single port, static frontend served from Express
- [x] systemd service file
- [ ] Web terminal (xterm.js + node-pty)
- [ ] PAM authentication
