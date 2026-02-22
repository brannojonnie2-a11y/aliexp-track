// Vercel Serverless Function: /api/sessions/:id
// In-memory store (shared via module scope within the same instance)

import { NextRequest, NextResponse } from 'next/server'

const sessions: Record<string, any> = global._sessions || (global._sessions = {})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  sessions[id] = { ...body, lastSeen: Date.now() }
  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  delete sessions[id]
  return NextResponse.json({ success: true })
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
