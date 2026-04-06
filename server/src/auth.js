const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const COOKIE_NAME = 'pi_dashboard_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 1000 * 60 * 60 * 8, // 8 hours
};

const AUTH_MODE = process.env.AUTH_MODE || 'static';

function authenticateStatic(username, password) {
  return (
    username === process.env.DASHBOARD_USER &&
    password === process.env.DASHBOARD_PASS
  );
}

function authenticatePam(username, password) {
  const pam = require('authenticate-pam');
  return new Promise((resolve, reject) => {
    pam.authenticate(username, password, (err) => {
      if (err) reject(err);
      else resolve();
    }, { serviceName: 'login', remoteHost: 'localhost' });
  });
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    if (AUTH_MODE === 'pam') {
      await authenticatePam(username, password);
    } else {
      if (!authenticateStatic(username, password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = jwt.sign({ username }, process.env.SESSION_SECRET, {
      expiresIn: '8h',
    });

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/verify', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    res.json({ ok: true, username: payload.username });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
module.exports.COOKIE_NAME = COOKIE_NAME;
