"use client"

import { useState, useEffect } from "react"
import { useWidgets } from "./WidgetContext"

interface AnimeShow {
    malId: number
    title: string
    imageUrl: string
    status: string
    nextEpisode: number | null
    airedEpisodes: number
    broadcastDay: string | null
    broadcastTime: string | null
}

interface AnimeWidgetProps {
    isDark: boolean
}

export function AnimeWidget({ isDark }: AnimeWidgetProps) {
    const { animeTracked: followedIds, setAnimeTracked: setFollowedIds } = useWidgets()
    const [shows, setShows] = useState<AnimeShow[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<AnimeShow[]>([])
    const [showSearch, setShowSearch] = useState(false)
    const [searchLoading, setSearchLoading] = useState(false)
    const [hoveredId, setHoveredId] = useState<number | null>(null)

    // Fetch details for followed anime
    useEffect(() => {
        if (followedIds.length === 0) {
            setShows([])
            setLoading(false)
            return
        }

        async function fetchFollowed() {
            setLoading(true)
            const results: AnimeShow[] = []

            // Jikan has rate limits (3 req/s), so we fetch sequentially with delays
            for (const id of followedIds) {
                try {
                    const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`)
                    if (!res.ok) continue
                    const json = await res.json()
                    const d = json.data
                    results.push({
                        malId: d.mal_id,
                        title: d.title,
                        imageUrl: d.images?.jpg?.small_image_url || "",
                        status: d.status || "Unknown",
                        nextEpisode: d.status === "Currently Airing" ? (d.episodes ? null : null) : null,
                        airedEpisodes: d.episodes || 0,
                        broadcastDay: d.broadcast?.day || null,
                        broadcastTime: d.broadcast?.time || null,
                    })
                    // Rate limit: wait 400ms between requests
                    await new Promise((r) => setTimeout(r, 400))
                } catch {
                    // Skip failed fetches
                }
            }
            setShows(results)
            setLoading(false)
        }

        fetchFollowed()
    }, [followedIds])

    // Search anime
    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (query.length < 3) {
            setSearchResults([])
            return
        }

        setSearchLoading(true)
        try {
            const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=6&sfw=true`)
            if (!res.ok) throw new Error()
            const json = await res.json()
            setSearchResults(
                json.data.map((d: any) => ({
                    malId: d.mal_id,
                    title: d.title,
                    imageUrl: d.images?.jpg?.small_image_url || "",
                    status: d.status || "Unknown",
                    nextEpisode: null,
                    airedEpisodes: d.episodes || 0,
                    broadcastDay: d.broadcast?.day || null,
                    broadcastTime: d.broadcast?.time || null,
                }))
            )
        } catch {
            setSearchResults([])
        } finally {
            setSearchLoading(false)
        }
    }

    const followAnime = (malId: number) => {
        if (!followedIds.includes(malId)) {
            setFollowedIds([...followedIds, malId])
        }
        setShowSearch(false)
        setSearchQuery("")
        setSearchResults([])
    }

    const unfollowAnime = (malId: number) => {
        setFollowedIds(followedIds.filter((id) => id !== malId))
        setShows((prev) => prev.filter((s) => s.malId !== malId))
    }

    const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)"
    const textPrimary = isDark ? "#f5f5f7" : "#1a1a1a"
    const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"

    const getStatusBadge = (status: string) => {
        if (status === "Currently Airing") {
            return { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "🟢 Airing" }
        }
        if (status === "Not yet aired") {
            return { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "⏳ Upcoming" }
        }
        return { color: textMuted, bg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", label: "✓ Finished" }
    }

    return (
        <div className={`widget-card ${isDark ? "" : "widget-card-light"}`}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    🎌 Anime Tracker
                </div>
                <button
                    onClick={() => setShowSearch(!showSearch)}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 16, color: textMuted, padding: "2px 4px",
                    }}
                    title="Search anime"
                >
                    {showSearch ? "✕" : "+"}
                </button>
            </div>

            {/* Search */}
            {showSearch && (
                <div style={{ marginBottom: 12 }}>
                    <input
                        type="text"
                        placeholder="Search anime..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{
                            width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                            border: `1px solid ${borderColor}`, color: textPrimary, outline: "none",
                        }}
                    />
                    {searchLoading && <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>Searching...</div>}
                    {searchResults.length > 0 && (
                        <div style={{ marginTop: 4, maxHeight: 200, overflowY: "auto" }}>
                            {searchResults.map((r) => (
                                <button
                                    key={r.malId}
                                    onClick={() => followAnime(r.malId)}
                                    disabled={followedIds.includes(r.malId)}
                                    style={{
                                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                                        padding: "6px 8px", background: "none", border: "none",
                                        color: followedIds.includes(r.malId) ? textMuted : textPrimary,
                                        cursor: followedIds.includes(r.malId) ? "default" : "pointer",
                                        fontSize: 13, borderRadius: 6, textAlign: "left",
                                        opacity: followedIds.includes(r.malId) ? 0.5 : 1,
                                    }}
                                    onMouseOver={(e) => !followedIds.includes(r.malId) && (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)")}
                                    onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                                >
                                    {r.imageUrl && (
                                        <img src={r.imageUrl} alt="" style={{ width: 28, height: 40, borderRadius: 4, objectFit: "cover" }} />
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                                        <div style={{ fontSize: 11, opacity: 0.6 }}>{r.status}{r.airedEpisodes ? ` · ${r.airedEpisodes} eps` : ""}</div>
                                    </div>
                                    {followedIds.includes(r.malId) && <span style={{ fontSize: 11 }}>✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Followed shows */}
            {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[1, 2].map((i) => (
                        <div key={i} className={isDark ? "skeleton" : "skeleton-light"} style={{ height: 48 }} />
                    ))}
                </div>
            ) : shows.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.4, textAlign: "center", padding: "12px 0" }}>
                    No anime tracked. Tap + to search.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {shows.map((show) => {
                        const badge = getStatusBadge(show.status)
                        return (
                            <div
                                key={show.malId}
                                onMouseEnter={() => setHoveredId(show.malId)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{
                                    display: "flex", gap: 8, alignItems: "center",
                                    padding: "6px 4px", borderRadius: 8,
                                }}
                            >
                                {show.imageUrl && (
                                    <img src={show.imageUrl} alt="" style={{ width: 28, height: 40, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 13, fontWeight: 500, color: textPrimary,
                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>
                                        {show.title}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                                        <span style={{
                                            fontSize: 10, padding: "1px 6px", borderRadius: 4,
                                            background: badge.bg, color: badge.color,
                                        }}>
                                            {badge.label}
                                        </span>
                                        {show.broadcastDay && (
                                            <span style={{ fontSize: 11, color: textMuted }}>
                                                {show.broadcastDay}{show.broadcastTime ? ` ${show.broadcastTime}` : ""}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => unfollowAnime(show.malId)}
                                    style={{
                                        background: "none", border: "none", cursor: "pointer",
                                        fontSize: 12, color: "#ef4444", padding: "4px 6px",
                                        flexShrink: 0, borderRadius: 4,
                                        opacity: hoveredId === show.malId ? 1 : 0,
                                        transition: "opacity 0.15s",
                                    }}
                                    title="Unfollow"
                                >
                                    ✕
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
