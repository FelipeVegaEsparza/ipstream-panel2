import { NextResponse } from 'next/server';

// This route is used by the health checker to verify that the application is running.
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
