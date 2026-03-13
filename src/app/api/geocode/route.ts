import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
        return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 })
    }

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
            {
                headers: {
                    "User-Agent": "BossModeApp/1.0 (local development)",
                    "Accept-Language": "en-US,en;q=0.9"
                }
            }
        )

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`)
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error("Geocoding proxy error:", error)
        return NextResponse.json({ error: "Failed to fetch location data" }, { status: 500 })
    }
}
