"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface CoinData {
    id: string
    symbol: string
    name: string
    image?: string
    price: number
    change24h: number
    marketCap: number
}

interface CryptoWidgetProps {
    isDark: boolean
}

const DEFAULT_COINS = ["bitcoin", "ethereum", "solana"]

function formatPrice(price: number): string {
    if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    if (price >= 1) return `$${price.toFixed(2)}`
    if (price >= 0.01) return `$${price.toFixed(4)}`
    return `$${price.toFixed(6)}`
}

function formatMarketCap(mc: number): string {
    if (mc >= 1e12) return `$${(mc / 1e12).toFixed(1)}T`
    if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`
    if (mc >= 1e6) return `$${(mc / 1e6).toFixed(1)}M`
    return `$${mc.toLocaleString()}`
}

export function CryptoWidget({ isDark }: CryptoWidgetProps) {
    const [coins, setCoins] = useState<CoinData[]>([])
    const [trackedIds, setTrackedIds] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [showSearch, setShowSearch] = useState(false)
    const [searchResults, setSearchResults] = useState<{ id: string; name: string; symbol: string }[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Load tracked coins from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("boss-mode-crypto-tracked")
        if (saved) {
            try {
                setTrackedIds(JSON.parse(saved))
            } catch {
                setTrackedIds(DEFAULT_COINS)
            }
        } else {
            setTrackedIds(DEFAULT_COINS)
        }
    }, [])

    const fetchPrices = useCallback(async () => {
        if (trackedIds.length === 0) {
            setCoins([])
            setLoading(false)
            return
        }

        try {
            const res = await fetch(`/api/crypto?ids=${trackedIds.join(",")}`)
            if (!res.ok) throw new Error("API error")
            const data = await res.json()
            setCoins(data.coins || [])
            setError(null)
        } catch {
            setError("Failed to load prices")
        } finally {
            setLoading(false)
        }
    }, [trackedIds])

    useEffect(() => {
        if (trackedIds.length > 0) {
            fetchPrices()
            const interval = setInterval(fetchPrices, 5 * 60 * 1000)
            return () => clearInterval(interval)
        } else {
            setLoading(false)
        }
    }, [fetchPrices, trackedIds])

    // Debounced search for coins
    const handleSearch = (query: string) => {
        setSearchQuery(query)
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

        if (query.length < 2) {
            setSearchResults([])
            return
        }

        searchTimerRef.current = setTimeout(async () => {
            setSearchLoading(true)
            try {
                const res = await fetch(`/api/crypto?search=${encodeURIComponent(query)}`)
                if (!res.ok) throw new Error()
                const data = await res.json()
                setSearchResults(data.results || [])
            } catch {
                setSearchResults([])
            } finally {
                setSearchLoading(false)
            }
        }, 400)
    }

    const addCoin = (id: string) => {
        if (!trackedIds.includes(id)) {
            const updated = [...trackedIds, id]
            setTrackedIds(updated)
            localStorage.setItem("boss-mode-crypto-tracked", JSON.stringify(updated))
        }
        setShowSearch(false)
        setSearchQuery("")
        setSearchResults([])
    }

    const removeCoin = (id: string) => {
        const updated = trackedIds.filter((t) => t !== id)
        setTrackedIds(updated)
        localStorage.setItem("boss-mode-crypto-tracked", JSON.stringify(updated))
    }

    const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)"
    const textPrimary = isDark ? "#f5f5f7" : "#1a1a1a"
    const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"

    return (
        <div className={`widget-card ${isDark ? "" : "widget-card-light"}`}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Crypto
                </div>
                <button
                    onClick={() => setShowSearch(!showSearch)}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 16, color: textMuted, padding: "2px 4px",
                    }}
                    title="Add coin"
                >
                    {showSearch ? "✕" : "+"}
                </button>
            </div>

            {/* Search */}
            {showSearch && (
                <div style={{ marginBottom: 12 }}>
                    <input
                        type="text"
                        placeholder="Search coins..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{
                            width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                            border: `1px solid ${borderColor}`,
                            color: textPrimary, outline: "none",
                        }}
                    />
                    {searchLoading && <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>Searching...</div>}
                    {searchResults.length > 0 && (
                        <div style={{ marginTop: 4, maxHeight: 150, overflowY: "auto" }}>
                            {searchResults.slice(0, 8).map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => addCoin(r.id)}
                                    style={{
                                        display: "flex", justifyContent: "space-between", width: "100%",
                                        padding: "6px 8px", background: "none", border: "none",
                                        color: textPrimary, cursor: "pointer", fontSize: 13,
                                        borderRadius: 6, textAlign: "left",
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)")}
                                    onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                                >
                                    <span>{r.name}</span>
                                    <span style={{ opacity: 0.5, textTransform: "uppercase" }}>{r.symbol}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {error && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>{error}</div>}

            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={isDark ? "skeleton" : "skeleton-light"} style={{ height: 36 }} />
                    ))}
                </div>
            ) : coins.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.4, textAlign: "center", padding: "12px 0" }}>
                    No coins tracked. Tap + to add.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {coins.map((coin) => (
                        <div
                            key={coin.id}
                            style={{
                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                padding: "6px 4px", borderRadius: 8, transition: "background 0.2s",
                            }}
                        >
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {coin.image && (
                                        <img
                                            src={coin.image}
                                            alt={coin.symbol}
                                            style={{ width: 16, height: 16, borderRadius: 4 }}
                                        />
                                    )}
                                    <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{coin.symbol.toUpperCase()}</span>
                                    <button
                                        onClick={() => removeCoin(coin.id)}
                                        style={{
                                            background: "none", border: "none", cursor: "pointer",
                                            fontSize: 10, color: textMuted, padding: 0, lineHeight: 1, opacity: 0.4,
                                        }}
                                        title="Remove"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <span style={{ fontSize: 11, color: textMuted }}>{formatMarketCap(coin.marketCap)}</span>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{formatPrice(coin.price)}</div>
                                <div style={{
                                    fontSize: 11, fontWeight: 600,
                                    color: coin.change24h >= 0 ? "#10b981" : "#ef4444",
                                }}>
                                    {coin.change24h >= 0 ? "▲" : "▼"} {Math.abs(coin.change24h).toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
