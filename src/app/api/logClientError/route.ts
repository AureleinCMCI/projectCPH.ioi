import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    console.error('--- Client Error Log START ---');
    console.error('Time:', new Date().toISOString());
    console.error('Payload:', JSON.stringify(payload, null, 2));
    console.error('--- Client Error Log END ---');
  } catch (err) {
    console.error('Failed to parse client error payload:', err);
  }

  return NextResponse.json({ ok: true });
}