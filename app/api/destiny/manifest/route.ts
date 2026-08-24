import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.BUNGIE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Bungie API key not configured.' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/', {
      headers: {
        'X-API-Key': apiKey,
      },
      signal: AbortSignal.timeout(10_000),
      cache: 'force-cache',
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      // Log upstream details server-side only; never leak them to clients.
      console.error(`Bungie manifest request failed (${response.status}):`, await response.text());
      return NextResponse.json(
        { error: 'Failed to fetch Destiny Manifest from Bungie API.' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60' },
    });

  } catch (error) {
    console.error('Unexpected error fetching Destiny Manifest:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
