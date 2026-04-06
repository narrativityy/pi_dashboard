# Pi Dashboard

A self-hosted web dashboard for Raspberry Pi devices. Monitor system health, view historical stats, and access a live terminal from any browser on your local network.

## Features

- **Login** — session-gated access via username/password, JWT stored as an httpOnly cookie
- **System Dashboard** — real-time CPU load, temperature, memory, disk, and uptime (updates every 3 seconds)
- **Stat History** — SQLite-backed logging every 60 seconds, 24-hour retention; sparkline previews on each card, click for a full chart
- **Temperature Unit Toggle** — switch between °F and °C from the header, defaults to °F, persists across sessions
- **Web Terminal** — full in-browser terminal session via xterm.js + node-pty
- **Auto-update** — systemd timer checks for new commits every 5 minutes and rebuilds automatically

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js, Express 4 |
| WebSocket | ws |
| Terminal | node-pty + xterm.js |
| System Stats | systeminformation |
| History | better-sqlite3 (SQLite) |
| Charts | recharts |
| Auth | Static credentials via `.env` or PAM (real Linux users) |

## Project Structure

```
pi_dashboard/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js                    # fetch wrappers for all API calls
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── context/
│   │   │   └── PrefsContext.jsx      # temperature unit preference (°F/°C)
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx         # stat cards + sparklines
│   │   │   └── Terminal.jsx          # xterm.js terminal
│   │   └── components/
│   │       ├── Header.jsx            # nav + temp unit toggle + logout
│   │       ├── ProtectedRoute.jsx    # redirects to /login if no session
│   │       └── StatDetail.jsx        # full 24-hour chart modal
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── index.js        # Express + HTTP server entry point
│   │   ├── auth.js         # /api/auth routes + JWT logic
│   │   ├── middleware.js   # requireAuth middleware
│   │   ├── stats.js        # /api/stats and /api/stats/history routes
│   │   ├── collector.js    # background job — snapshots stats every 60s
│   │   ├── db.js           # SQLite schema + prepared statements
│   │   └── terminal.js     # node-pty WebSocket handler
│   ├── .env                # credentials — do not commit
│   ├── .env.example
│   └── package.json
├── data/                   # SQLite database (gitignored)
├── start.sh                # production start script
├── update.sh               # pull latest + rebuild
├── pi-dashboard.service    # systemd unit — runs the server
├── pi-dashboard-update.service  # systemd unit — runs update.sh
├── pi-dashboard-update.timer    # systemd timer — triggers update every 5 min
└── README.md
```

## Authentication

On login the server issues a signed JWT stored as an httpOnly cookie — required for all API calls and the terminal WebSocket connection. Two auth modes are supported, set via `AUTH_MODE` in `server/.env`.

### Static (default)

Username and password are set directly in `.env`. Good for a personal install where you just want simple access control.

```
AUTH_MODE=static
DASHBOARD_USER=youruser
DASHBOARD_PASS=yourpassword
SESSION_SECRET=a-long-random-string
PORT=3001
```

### PAM

Authenticates against real Linux user accounts on the host device using the system's PAM stack. Any user account on the Pi can log in with their actual system password — no hardcoded credentials needed. Makes the project portable: clone it, set `AUTH_MODE=pam`, done.

```
AUTH_MODE=pam
SESSION_SECRET=a-long-random-string
PORT=3001
```

**Requirements for PAM mode:**

1. Install the PAM dev library:
   ```bash
   sudo apt install libpam0g-dev
   ```

2. Add the server's user to the `shadow` group so it can authenticate against `/etc/shadow`:
   ```bash
   sudo usermod -a -G shadow pi
   ```
   > If using the systemd service, `SupplementaryGroups=shadow` is already set in `pi-dashboard.service` — just reload and restart after copying the updated service file.

> **Note:** PAM auth only gates access to the dashboard. The terminal session still runs as whichever user started the server, not the logged-in user.

## Getting Started

### Prerequisites

The default Raspberry Pi OS repos ship an outdated version of Node.js. Install via NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Everything else:

```bash
sudo apt install -y git build-essential python3 libpam0g-dev
```

| Package | Why |
|---|---|
| `nodejs` (22 LTS) | runtime for the server |
| `npm` | comes bundled with Node.js |
| `git` | clone the repo |
| `build-essential` | compiles native modules (node-pty, better-sqlite3, authenticate-pam) |
| `python3` | required by node-gyp for native module compilation |
| `libpam0g-dev` | PAM header library required by authenticate-pam |

### Install

```bash
git clone <repo-url> pi_dashboard
cd pi_dashboard
npm install
cd server && npm install
cd ../client && npm install
```

### Configure

```bash
cp server/.env.example server/.env
# edit server/.env with your credentials
```

### Development

Runs the frontend dev server (port 5173) and backend (port 3001) separately. Vite proxies `/api` requests to the backend.

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

`start.sh` builds the React app and starts the server in production mode. Everything is served from a single port — no separate frontend server needed.

```bash
./start.sh
```

Then open `http://<pi-ip>:3001` from any device on your network.

### Auto-start on Boot

The service file defaults to the following — edit `pi-dashboard.service` if anything differs:

| Field | Default value |
|---|---|
| `User` | `pi` |
| `WorkingDirectory` | `/home/pi/Documents/pi_dashboard/server` |
| `ExecStart` | `/usr/bin/node src/index.js` |

Verify your node path first with `which node`, then:

```bash
sudo cp pi-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pi-dashboard
sudo systemctl start pi-dashboard
```

Check status:
```bash
sudo systemctl status pi-dashboard
sudo journalctl -u pi-dashboard -n 50 --no-pager
```

### Auto-update

A systemd timer checks for new commits on `origin/main` every 5 minutes. If changes are found it pulls, rebuilds, and restarts the service automatically.

```bash
sudo cp pi-dashboard-update.service /etc/systemd/system/
sudo cp pi-dashboard-update.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pi-dashboard-update.timer
sudo systemctl start pi-dashboard-update.timer
```

Check timer status:
```bash
sudo systemctl status pi-dashboard-update.timer
sudo journalctl -u pi-dashboard-update.service -n 20 --no-pager
```

Trigger a manual update at any time:
```bash
cd ~/Documents/pi_dashboard && ./update.sh
```

**Note:** Several dashboard actions need `sudo` without a password prompt. Create a sudoers file covering all of them:
```bash
sudo tee /etc/sudoers.d/pi-dashboard << 'EOF'
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart pi-dashboard
pi ALL=(ALL) NOPASSWD: /bin/systemctl start *
pi ALL=(ALL) NOPASSWD: /bin/systemctl stop *
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart *
pi ALL=(ALL) NOPASSWD: /sbin/reboot
pi ALL=(ALL) NOPASSWD: /sbin/shutdown
EOF
```

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | — | Log in, sets JWT cookie |
| POST | `/api/auth/logout` | — | Clears JWT cookie |
| GET | `/api/auth/verify` | — | Check if session is valid |
| GET | `/api/stats` | required | Live system metrics snapshot |
| GET | `/api/stats/history` | required | Last 24 hours of logged stats |
| GET | `/api/services` | required | List managed systemd services |
| POST | `/api/services/:name/:action` | required | start/restart (free), stop (password required) |
| GET | `/api/services/:name/logs` | required | Last 100 journalctl lines for a service |
| GET | `/api/system/info` | required | OS, kernel, CPU, RAM, uptime |
| POST | `/api/system/reboot` | required | Reboot device (password required) |
| POST | `/api/system/shutdown` | required | Shutdown device (password required) |
| GET | `/api/processes` | required | Top 30 processes by CPU usage |
| POST | `/api/processes/:pid/kill` | required | SIGTERM a process (password required) |

## Roadmap

- [x] Project structure
- [x] Auth — JWT httpOnly cookie, login/logout/verify
- [x] Stats API — CPU, temperature, memory, disk, uptime
- [x] Dashboard UI — live stat cards, 3s polling
- [x] Stat history — SQLite logging, 24-hour retention
- [x] History charts — sparkline previews + full detail modal
- [x] Temperature unit toggle — °F/°C, persists in localStorage
- [x] Web terminal — xterm.js + node-pty + WebSocket
- [x] Production build — single port, static frontend served from Express
- [x] systemd service — auto-start on boot
- [x] systemd timer — auto-update from GitHub every 5 minutes
- [x] PAM authentication — real Linux user login via AUTH_MODE=pam
- [x] Service manager — list, start, restart, stop systemd services with auth
- [x] Service logs — journalctl output per service in a modal
- [x] Network info — hostname, IP, interface, rx/tx bytes
- [x] System info — OS, kernel, CPU, RAM, uptime
- [x] System controls — password-gated reboot and shutdown
- [x] Process manager — top 30 processes by CPU, kill with auth
- [ ] WiFi hotspot mode — USB dongle as AP, onboard WiFi for internet
