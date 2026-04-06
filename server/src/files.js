const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();

const ROOT = process.env.FILES_ROOT || process.env.HOME || '/home/pi';

function safePath(reqPath) {
  const resolved = path.resolve(ROOT, reqPath ? reqPath.replace(/^\/+/, '') : '');
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error('Access denied');
  }
  return resolved;
}

function relPath(absPath) {
  return absPath === ROOT ? '/' : absPath.slice(ROOT.length);
}

// GET /api/files?path=
router.get('/', (req, res) => {
  let abs;
  try { abs = safePath(req.query.path || ''); }
  catch { return res.status(403).json({ error: 'Access denied' }); }

  let stat;
  try { stat = fs.statSync(abs); }
  catch { return res.status(404).json({ error: 'Path not found' }); }

  if (!stat.isDirectory()) {
    return res.status(400).json({ error: 'Not a directory' });
  }

  let entries;
  try { entries = fs.readdirSync(abs); }
  catch { return res.status(500).json({ error: 'Cannot read directory' }); }

  const items = entries
    .map((name) => {
      const full = path.join(abs, name);
      try {
        const s = fs.statSync(full);
        return {
          name,
          path: relPath(full),
          type: s.isDirectory() ? 'dir' : 'file',
          size: s.isDirectory() ? null : s.size,
          modified: s.mtimeMs,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  res.json({ path: relPath(abs), root: ROOT, items });
});

// GET /api/files/download?path=
router.get('/download', (req, res) => {
  let abs;
  try { abs = safePath(req.query.path || ''); }
  catch { return res.status(403).json({ error: 'Access denied' }); }

  try {
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) return res.status(400).json({ error: 'Cannot download a directory' });
  } catch { return res.status(404).json({ error: 'File not found' }); }

  res.download(abs);
});

// POST /api/files/upload?path=  (multipart/form-data, field: file)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  let dir;
  try { dir = safePath(req.query.path || ''); }
  catch { return res.status(403).json({ error: 'Access denied' }); }

  const dest = path.join(dir, req.file.originalname);
  try { fs.writeFileSync(dest, req.file.buffer); }
  catch (err) { return res.status(500).json({ error: err.message }); }

  res.json({ ok: true, path: relPath(dest) });
});

module.exports = router;
