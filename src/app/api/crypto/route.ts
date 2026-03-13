import { NextRequest, NextResponse } from "next/server"

// CoinGecko free API — no key required
const CG_BASE = "https://api.coingecko.com/api/v3"

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.get("ids")
    const search = searchParams.get("search")

    try {
        if (search) {
            // Search for coins by name/symbol
            const res = await fetch(
                `${CG_BASE}/search?query=${encodeURIComponent(search)}`,
                { next: { revalidate: 3600 } } // Cache search results for 1 hour
            )

            if (!res.ok) {
                console.error("CoinGecko Search Error:", await res.text())
                return NextResponse.json({ error: "CoinGecko API error" }, { status: res.status })
            }

            const data = await res.json()
            const filtered = (data.coins || [])
                .slice(0, 10)
                .map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    symbol: c.symbol,
                }))

            return NextResponse.json({ results: filtered })
        }

        if (ids) {
            // Get prices for specific coins by CoinGecko ID
            const coinIds = ids.split(",").map((s) => s.trim()).join(",")
            const res = await fetch(
                `${CG_BASE}/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`,
                { next: { revalidate: 300 } } // Cache prices for 5 minutes
            )

            if (!res.ok) {
                console.error("CoinGecko Price Error:", await res.text())
                return NextResponse.json({ error: "CoinGecko API error" }, { status: res.status })
            }

            const data = await res.json()
            const coins = data.map((c: any) => ({
                id: c.id,
                symbol: c.symbol,
                name: c.name,
                image: c.image,
                price: c.current_price,
                change24h: c.price_change_percentage_24h ?? 0,
                marketCap: c.market_cap ?? 0,
            }))

            return NextResponse.json({ coins })
        }

        return NextResponse.json({ error: "Provide 'ids' or 'search' parameter" }, { status: 400 })
    } catch (err) {
        console.error("Crypto API error:", err)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
