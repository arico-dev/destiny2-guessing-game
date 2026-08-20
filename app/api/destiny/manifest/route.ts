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
      cache: 'force-cache',
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: 'Failed to fetch Destiny Manifest from Bungie API.', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=60' },
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
