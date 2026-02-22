// Vercel Serverless Function: /api/sessions
// Uses an in-memory store (for Vercel serverless; for persistence use a DB like Upstash/Redis)

const sessions = {};

function cleanStaleSessions() {
  const now = Date.now();
  Object.keys(sessions).forEach((id) => {
    if (now - sessions[id].lastSeen > 30000) {
      delete sessions[id];
    }
  });
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  cleanStaleSessions();

  if (req.method === 'GET') {
    return res.status(200).json(sessions);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
