export async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Invalid credentials');
  return res.json();
}

export async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function verify() {
  const res = await fetch('/api/auth/verify', {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

export async function getStats() {
  const res = await fetch('/api/stats', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function getHistory() {
  const res = await fetch('/api/stats/history?hours=24', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function getServices() {
  const res = await fetch('/api/services', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json();
}

export async function getServiceLogs(name, lines = 100) {
  const res = await fetch(`/api/services/${name}/logs?lines=${lines}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function getSystemInfo() {
  const res = await fetch('/api/system/info', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch system info');
  return res.json();
}

export async function systemAction(action, password) {
  const res = await fetch(`/api/system/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to ${action}`);
  return data;
}

export async function getProcesses() {
  const res = await fetch('/api/processes', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch processes');
  return res.json();
}

export async function killProcess(pid, password) {
  const res = await fetch(`/api/processes/${pid}/kill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to kill process');
  return data;
}

export async function serviceAction(name, action, password = null) {
  const res = await fetch(`/api/services/${name}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(password ? { password } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Failed to ${action} ${name}`);
  return data;
}

export async function getWifiStatus() {
  const res = await fetch('/api/wifi/status', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch WiFi status');
  return res.json();
}

export async function getWifiNetworks(rescan = false) {
  const res = await fetch(`/api/wifi/networks?rescan=${rescan}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch WiFi networks');
  return res.json();
}

export async function wifiConnect(ssid, password = null) {
  const res = await fetch('/api/wifi/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(password ? { ssid, password } : { ssid }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to connect');
  return data;
}

export async function wifiDisconnect() {
  const res = await fetch('/api/wifi/disconnect', {
    method: 'POST',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to disconnect');
  return data;
}

export async function listFiles(path = '') {
  const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, { credentials: 'include' });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to list files'); }
  return res.json();
}

export function downloadFileUrl(path) {
  return `/api/files/download?path=${encodeURIComponent(path)}`;
}

export async function uploadFile(dirPath, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/files/upload?path=${encodeURIComponent(dirPath)}`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}
