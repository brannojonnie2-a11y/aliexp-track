// Vercel Serverless Function: GET /api/sessions
// Returns all active sessions (last seen within 30 seconds)

const sessions = global._sessions || (global._sessions = {});

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const now = Date.now();
    const active = {};
    Object.entries(sessions).forEach(([id, data]) => {
      if (now - data.lastSeen < 30000) active[id] = data;
    });
    return res.status(200).json(active);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
