function authenticatePam(username, password) {
  const pam = require('authenticate-pam');
  return new Promise((resolve, reject) => {
    pam.authenticate(username, password, (err) => {
      if (err) reject(err);
      else resolve();
    }, { serviceName: 'login', remoteHost: 'localhost' });
  });
}

async function verifyPassword(username, password) {
  const mode = process.env.AUTH_MODE || 'static';
  if (mode === 'pam') {
    await authenticatePam(username, password);
  } else {
    if (
      username !== process.env.DASHBOARD_USER ||
      password !== process.env.DASHBOARD_PASS
    ) {
      throw new Error('Invalid credentials');
    }
  }
}

module.exports = verifyPassword;
