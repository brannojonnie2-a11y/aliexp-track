// Vercel Serverless Function: /api/actions/:id

import { NextRequest, NextResponse } from 'next/server'

const actions: Record<string, any> = global._actions || (global._actions = {})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return NextResponse.json({ action: actions[id] || 'normal' })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  actions[id] = body.action
  return NextResponse.json({ success: true })
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
