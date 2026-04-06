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
