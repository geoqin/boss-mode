"use client"

import { useState } from "react"

interface GoogleSearchWidgetProps {
    isDark: boolean
}

export function GoogleSearchWidget({ isDark }: GoogleSearchWidgetProps) {
    const [query, setQuery] = useState("")

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (query.trim()) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank")
            setQuery("")
        }
    }

    const textPrimary = isDark ? "#f5f5f7" : "#1a1a1a"
    const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"

    return (
        <div className={`widget-card ${isDark ? "" : "widget-card-light"}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Search
                </div>
            </div>

            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search Google..."
                    style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: 12,
                        fontSize: 14,
                        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                        border: `1px solid ${borderColor}`,
                        color: textPrimary,
                        outline: "none",
                        transition: "all 0.2s",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = borderColor }}
                />
            </form>
        </div>
    )
}
