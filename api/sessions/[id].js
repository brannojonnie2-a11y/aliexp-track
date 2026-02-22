// Vercel Serverless Function: /api/sessions/:id
// In-memory store (shared via module scope within the same instance)

const sessions = global._sessions || (global._sessions = {});

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (req.method === 'POST') {
    sessions[id] = { ...req.body, lastSeen: Date.now() };
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    delete sessions[id];
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
