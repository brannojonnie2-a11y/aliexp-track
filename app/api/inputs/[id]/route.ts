// Vercel Serverless Function: /api/inputs/:id

import { NextRequest, NextResponse } from 'next/server'

const inputs: Record<string, any> = global._inputs || (global._inputs = {})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return NextResponse.json(inputs[id] || {})
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  inputs[id] = body
  return NextResponse.json({ success: true })
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 })
}
