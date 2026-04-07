const express = require('express');
const { execFile } = require('child_process');
const router = express.Router();

function run(cmd, args, timeout = 15000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

function nmcli(...args) { return run('nmcli', args); }
function sudoNmcli(...args) { return run('sudo', ['nmcli', ...args], 30000); }

// Parse nmcli -t output (colons separator, \: escaped within values)
function parseTerse(line) {
  const fields = [];
  let current = '';
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '\\' && i + 1 < line.length && line[i + 1] === ':') {
      current += ':'; i++;
    } else if (line[i] === ':') {
      fields.push(current); current = '';
    } else {
      current += line[i];
    }
  }
  fields.push(current);
  return fields;
}

function signalBars(signal) {
  if (signal >= 75) return 4;
  if (signal >= 50) return 3;
  if (signal >= 25) return 2;
  return 1;
}

// Returns { wlan0: 'managed', wlan1: 'AP', ... } using iw dev
async function getIfaceModes() {
  try {
    const out = await run('iw', ['dev']);
    const modes = {};
    let current = null;
    for (const line of out.split('\n')) {
      const m = line.match(/Interface\s+(\S+)/);
      if (m) current = m[1];
      const t = line.match(/type\s+(\S+)/);
      if (t && current) modes[current] = t[1]; // 'managed', 'AP', 'monitor', etc.
    }
    return modes;
  } catch {
    return {};
  }
}

// Fallback: check NM connection profile to see if it's an AP (802-11-wireless.mode: ap)
async function isNmConnectionAP(connectionName) {
  if (!connectionName || connectionName === '--') return false;
  try {
    const out = await nmcli('-t', '-f', '802-11-wireless.mode', 'connection', 'show', connectionName);
    return /:\s*ap\s*$/im.test(out);
  } catch {
    return false;
  }
}

async function getDeviceIP(device) {
  try {
    const out = await nmcli('-t', '-f', 'IP4.ADDRESS', 'device', 'show', device);
    const match = out.match(/IP4\.ADDRESS\[1\]:([^/\n]+)/);
    return match ? match[1].trim() : null;
  } catch { return null; }
}

async function getConnectedSSID(device) {
  try {
    const out = await run('iw', ['dev', device, 'link']);
    const match = out.match(/SSID:\s+(.+)/);
    return match ? match[1].trim() : null;
  } catch { return null; }
}

// Returns { internet, hotspot } — either can be null
async function getWifiRoles() {
  const [modes, devOut] = await Promise.all([
    getIfaceModes(),
    nmcli('-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'device', 'status'),
  ]);

  const wifiDevices = devOut.split('\n')
    .filter(Boolean)
    .map(parseTerse)
    .filter(([, type]) => type === 'wifi');

  let internet = null;
  let hotspot = null;

  for (const [device, , state, connection] of wifiDevices) {
    const mode = modes[device];
    // iw dev reports 'AP' for NM-managed hotspots; fall back to checking the NM profile
    const isAP = mode === 'AP' || (mode === undefined && await isNmConnectionAP(connection));
    if (isAP) {
      // Hotspot — get SSID from NM connection profile
      let ssid = connection;
      try {
        const ssidOut = await nmcli('-t', '-f', '802-11-wireless.ssid', 'connection', 'show', connection);
        const s = ssidOut.split(':').pop()?.trim();
        if (s) ssid = s;
      } catch {}
      const ip = state === 'connected' ? await getDeviceIP(device) : null;
      hotspot = { device, active: state === 'connected', ssid, ip };
    } else {
      // Internet (managed) interface
      const connected = state === 'connected';
      const [ip, ssid] = connected
        ? await Promise.all([getDeviceIP(device), getConnectedSSID(device)])
        : [null, null];
      internet = { device, connected, ssid, ip };
    }
  }

  return { internet, hotspot };
}

// GET /api/wifi/status
router.get('/status', async (req, res) => {
  try {
    res.json(await getWifiRoles());
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

// GET /api/wifi/networks?rescan=true
router.get('/networks', async (req, res) => {
  try {
    const { internet, hotspot } = await getWifiRoles();

    // Scan only on the managed (internet) interface
    const internetDevice = internet?.device || null;
    const hotspotSsids = new Set();

    // Hide the hotspot's own SSID from the scan list
    if (hotspot?.ssid) hotspotSsids.add(hotspot.ssid);

    const rescan = req.query.rescan === 'true' ? 'yes' : 'auto';
    const args = ['-t', '-f', 'IN-USE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list', '--rescan', rescan];
    if (internetDevice) args.push('ifname', internetDevice);

    const out = await nmcli(...args);
    const seen = new Set();

    const networks = out.split('\n')
      .filter(Boolean)
      .map((line) => {
        const [inUse, ssid, signalStr, security] = parseTerse(line);
        if (!ssid || hotspotSsids.has(ssid)) return null;
        const signal = parseInt(signalStr, 10) || 0;
        return {
          ssid,
          signal,
          bars: signalBars(signal),
          secured: security !== '--' && security !== '',
          security: security === '--' ? 'Open' : security,
          connected: inUse === '*',
        };
      })
      .filter(Boolean)
      .filter((n) => {
        if (seen.has(n.ssid)) return false;
        seen.add(n.ssid);
        return true;
      })
      .sort((a, b) => b.signal - a.signal);

    res.json(networks);
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

// POST /api/wifi/connect  { ssid, password? }
router.post('/connect', async (req, res) => {
  const { ssid, password } = req.body;
  if (!ssid) return res.status(400).json({ error: 'SSID required' });

  try {
    const { internet } = await getWifiRoles();
    const internetDevice = internet?.device || null;

    // Try bringing up a saved connection first
    try {
      const upArgs = ['connection', 'up', ssid];
      if (internetDevice) upArgs.push('ifname', internetDevice);
      await sudoNmcli(...upArgs);
      return res.json({ ok: true });
    } catch {
      // Not a saved connection — fall through to wifi connect
    }

    const args = ['device', 'wifi', 'connect', ssid];
    if (internetDevice) args.push('ifname', internetDevice);
    if (password) args.push('password', password);
    await sudoNmcli(...args);
    res.json({ ok: true });
  } catch (err) {
    const msg = String(err.message);
    if (msg.includes('Secrets were required') || msg.includes('password')) {
      return res.status(400).json({ error: 'Incorrect WiFi password' });
    }
    if (msg.includes('not found')) {
      return res.status(404).json({ error: 'Network not found' });
    }
    res.status(500).json({ error: msg });
  }
});

// POST /api/wifi/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    const { internet } = await getWifiRoles();
    const internetDevice = internet?.device || null;
    if (!internetDevice) return res.status(404).json({ error: 'No internet WiFi interface found' });
    await sudoNmcli('device', 'disconnect', internetDevice);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: String(err.message) });
  }
});

module.exports = router;
