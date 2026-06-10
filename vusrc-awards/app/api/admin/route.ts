import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // TODO: admin-authenticated endpoints go here or under nested routes
  void request
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}
