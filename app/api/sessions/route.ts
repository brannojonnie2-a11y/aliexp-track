// Vercel Serverless Function: GET /api/sessions
// Returns all active sessions (last seen within 30 seconds)

import { NextRequest, NextResponse } from 'next/server'

const sessions: Record<string, any> = global._sessions || (global._sessions = {})

export async function GET(request: NextRequest) {
  const now = Date.now()
  const active: Record<string, any> = {}

  Object.entries(sessions).forEach(([id, data]) => {
    if (now - data.lastSeen < 30000) {
      active[id] = data
    }
  })

  return NextResponse.json(active)
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
