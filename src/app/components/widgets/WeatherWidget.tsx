"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface WeatherData {
    temperature: number
    apparentTemperature: number
    weatherCode: number
    windSpeed: number
    humidity: number
    isDay: boolean
    dailyHigh: number
    dailyLow: number
    forecast: { date: string; high: number; low: number; code: number }[]
}

interface SavedLocation {
    name: string
    lat: number
    lon: number
}

interface GeoResult {
    id: number
    name: string
    admin1?: string
    country: string
    latitude: number
    longitude: number
}

interface WeatherWidgetProps {
    isDark: boolean
}

const LOCATION_STORAGE_KEY = "boss-mode-weather-location"

const WMO_CODES: Record<number, { label: string; emoji: string; theme: string }> = {
    0: { label: "Clear Sky", emoji: "☀️", theme: "sunny" },
    1: { label: "Mostly Clear", emoji: "🌤️", theme: "sunny" },
    2: { label: "Partly Cloudy", emoji: "⛅", theme: "cloudy" },
    3: { label: "Overcast", emoji: "☁️", theme: "cloudy" },
    45: { label: "Foggy", emoji: "🌫️", theme: "cloudy" },
    48: { label: "Rime Fog", emoji: "🌫️", theme: "cloudy" },
    51: { label: "Light Drizzle", emoji: "🌦️", theme: "rainy" },
    53: { label: "Drizzle", emoji: "🌦️", theme: "rainy" },
    55: { label: "Heavy Drizzle", emoji: "🌧️", theme: "rainy" },
    61: { label: "Light Rain", emoji: "🌧️", theme: "rainy" },
    63: { label: "Rain", emoji: "🌧️", theme: "rainy" },
    65: { label: "Heavy Rain", emoji: "🌧️", theme: "rainy" },
    66: { label: "Freezing Rain", emoji: "🌨️", theme: "snowy" },
    67: { label: "Heavy Freezing Rain", emoji: "🌨️", theme: "snowy" },
    71: { label: "Light Snow", emoji: "🌨️", theme: "snowy" },
    73: { label: "Snow", emoji: "❄️", theme: "snowy" },
    75: { label: "Heavy Snow", emoji: "❄️", theme: "snowy" },
    77: { label: "Snow Grains", emoji: "🌨️", theme: "snowy" },
    80: { label: "Light Showers", emoji: "🌦️", theme: "rainy" },
    81: { label: "Showers", emoji: "🌧️", theme: "rainy" },
    82: { label: "Heavy Showers", emoji: "🌧️", theme: "rainy" },
    85: { label: "Snow Showers", emoji: "🌨️", theme: "snowy" },
    86: { label: "Heavy Snow Showers", emoji: "🌨️", theme: "snowy" },
    95: { label: "Thunderstorm", emoji: "⛈️", theme: "stormy" },
    96: { label: "Thunderstorm w/ Hail", emoji: "⛈️", theme: "stormy" },
    99: { label: "Thunderstorm w/ Heavy Hail", emoji: "⛈️", theme: "stormy" },
}

function getWeatherInfo(code: number) {
    return WMO_CODES[code] || { label: "Unknown", emoji: "🌡️", theme: "cloudy" }
}

function getDayName(dateStr: string) {
    const date = new Date(dateStr + "T00:00:00")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) return "Today"
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow"
    return date.toLocaleDateString("en-US", { weekday: "short" })
}

export function WeatherWidget({ isDark }: WeatherWidgetProps) {
    const [weather, setWeather] = useState<WeatherData | null>(null)
    const [loading, setLoading] = useState(true)
    const [locationName, setLocationName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<GeoResult[]>([])
    const [searchLoading, setSearchLoading] = useState(false)
    const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

    const fetchWeather = useCallback(async (lat: number, lon: number) => {
        try {
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`
            )
            const data = await res.json()

            setWeather({
                temperature: Math.round(data.current.temperature_2m),
                apparentTemperature: Math.round(data.current.apparent_temperature),
                weatherCode: data.current.weather_code,
                windSpeed: Math.round(data.current.wind_speed_10m),
                humidity: data.current.relative_humidity_2m,
                isDay: data.current.is_day === 1,
                dailyHigh: Math.round(data.daily.temperature_2m_max[0]),
                dailyLow: Math.round(data.daily.temperature_2m_min[0]),
                forecast: data.daily.time.slice(1).map((date: string, i: number) => ({
                    date,
                    high: Math.round(data.daily.temperature_2m_max[i + 1]),
                    low: Math.round(data.daily.temperature_2m_min[i + 1]),
                    code: data.daily.weather_code[i + 1],
                })),
            })
            setError(null)
            setLoading(false)
        } catch {
            setError("Failed to load weather")
            setLoading(false)
        }
    }, [])

    // Load saved location or use geolocation
    useEffect(() => {
        const saved = localStorage.getItem(LOCATION_STORAGE_KEY)
        if (saved) {
            try {
                const loc: SavedLocation = JSON.parse(saved)
                setSavedLocation(loc)
                setLocationName(`📍 ${loc.name}`)
                fetchWeather(loc.lat, loc.lon)
                return
            } catch { /* fall through */ }
        }

        // No saved location — try geolocation, fallback to Sydney
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setLocationName("📍 Current Location")
                    fetchWeather(pos.coords.latitude, pos.coords.longitude)
                },
                () => {
                    setLocationName("📍 Sydney, AU")
                    fetchWeather(-33.8688, 151.2093)
                },
                { timeout: 5000 }
            )
        } else {
            setLocationName("📍 Sydney, AU")
            fetchWeather(-33.8688, 151.2093)
        }
    }, [fetchWeather])

    // Auto-refresh every 30 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            if (savedLocation) {
                fetchWeather(savedLocation.lat, savedLocation.lon)
            } else if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                    () => fetchWeather(-33.8688, 151.2093),
                    { timeout: 5000 }
                )
            }
        }, 30 * 60 * 1000)
        return () => clearInterval(interval)
    }, [savedLocation, fetchWeather])

    // Debounced geocoding search
    const handleSearchInput = (query: string) => {
        setSearchQuery(query)
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

        if (query.length < 2) {
            setSearchResults([])
            return
        }

        searchTimerRef.current = setTimeout(async () => {
            setSearchLoading(true)
            try {
                const res = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
                )
                const data = await res.json()
                setSearchResults(data.results || [])
            } catch {
                setSearchResults([])
            } finally {
                setSearchLoading(false)
            }
        }, 300)
    }

    const selectLocation = (result: GeoResult) => {
        const name = result.admin1
            ? `${result.name}, ${result.admin1}, ${result.country}`
            : `${result.name}, ${result.country}`

        const loc: SavedLocation = { name, lat: result.latitude, lon: result.longitude }
        setSavedLocation(loc)
        setLocationName(`📍 ${name}`)
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(loc))

        // Close search and fetch new weather
        setShowSearch(false)
        setSearchQuery("")
        setSearchResults([])
        setLoading(true)
        fetchWeather(loc.lat, loc.lon)
    }

    const openSearch = () => {
        setShowSearch(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
    }

    const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    const textPrimary = isDark ? "#f5f5f7" : "#1a1a1a"
    const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)"

    if (error && !weather) {
        return (
            <div className={`widget-card ${isDark ? "" : "widget-card-light"}`}>
                <div style={{ fontSize: 13, opacity: 0.5 }}>{error}</div>
            </div>
        )
    }

    if (loading || !weather) {
        return (
            <div className={`widget-card ${isDark ? "" : "widget-card-light"}`}>
                <div className={isDark ? "skeleton" : "skeleton-light"} style={{ height: 20, width: "60%", marginBottom: 8 }} />
                <div className={isDark ? "skeleton" : "skeleton-light"} style={{ height: 48, width: "40%", marginBottom: 8 }} />
                <div className={isDark ? "skeleton" : "skeleton-light"} style={{ height: 14, width: "80%" }} />
            </div>
        )
    }

    const info = getWeatherInfo(weather.weatherCode)
    const themeClass = !weather.isDay ? "weather-night" : `weather-${info.theme}`

    return (
        <div className={`widget-card ${isDark ? themeClass : "widget-card-light"} ${!isDark ? themeClass : ""}`}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                    <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                        Weather
                    </div>
                    <button
                        onClick={openSearch}
                        style={{
                            background: "none", border: "none", padding: 0, margin: 0,
                            fontSize: 11, opacity: 0.5, cursor: "pointer", color: "inherit",
                            textDecoration: "none", textAlign: "left",
                            transition: "opacity 0.2s",
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.textDecoration = "underline" }}
                        onMouseOut={(e) => { e.currentTarget.style.opacity = "0.5"; e.currentTarget.style.textDecoration = "none" }}
                        title="Click to change location"
                    >
                        {locationName}
                    </button>
                </div>
                <span style={{ fontSize: 32, lineHeight: 1 }}>{info.emoji}</span>
            </div>

            {/* Location search dropdown */}
            {showSearch && (
                <div style={{
                    marginBottom: 12, borderRadius: 10, overflow: "hidden",
                    border: `1px solid ${borderColor}`,
                    background: isDark ? "rgba(20,20,20,0.95)" : "rgba(255,255,255,0.98)",
                    backdropFilter: "blur(12px)",
                }}>
                    <div style={{ padding: "8px 10px", borderBottom: `1px solid ${borderColor}` }}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Search suburb or city..."
                            value={searchQuery}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Escape") setShowSearch(false) }}
                            style={{
                                width: "100%", padding: "4px 0", fontSize: 13,
                                background: "none", border: "none", outline: "none",
                                color: textPrimary,
                            }}
                        />
                    </div>
                    {searchLoading && (
                        <div style={{ padding: "8px 10px", fontSize: 12, color: textMuted }}>Searching...</div>
                    )}
                    {searchResults.length > 0 && (
                        <div style={{ maxHeight: 180, overflowY: "auto" }}>
                            {searchResults.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => selectLocation(r)}
                                    style={{
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "8px 10px", background: "none", border: "none",
                                        borderBottom: `1px solid ${borderColor}`,
                                        color: textPrimary, cursor: "pointer", fontSize: 12,
                                        transition: "background 0.15s",
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)")}
                                    onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                                >
                                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                                    <div style={{ fontSize: 11, color: textMuted }}>
                                        {[r.admin1, r.country].filter(Boolean).join(", ")}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
                        <div style={{ padding: "8px 10px", fontSize: 12, color: textMuted }}>No results found</div>
                    )}
                </div>
            )}

            {/* Current temp */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 42, fontWeight: 700, lineHeight: 1 }}>{weather.temperature}°</span>
                <span style={{ fontSize: 14, opacity: 0.6 }}>Feels {weather.apparentTemperature}°</span>
            </div>

            <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 500 }}>{info.label}</div>

            {/* Details row */}
            <div style={{ display: "flex", gap: 16, fontSize: 12, opacity: 0.6, marginBottom: 12 }}>
                <span>H: {weather.dailyHigh}° L: {weather.dailyLow}°</span>
                <span>💨 {weather.windSpeed} km/h</span>
                <span>💧 {weather.humidity}%</span>
            </div>

            {/* 3-day forecast */}
            <div style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, paddingTop: 8 }}>
                {weather.forecast.map((day) => {
                    const dayInfo = getWeatherInfo(day.code)
                    return (
                        <div
                            key={day.date}
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 13 }}
                        >
                            <span style={{ width: 70 }}>{getDayName(day.date)}</span>
                            <span>{dayInfo.emoji}</span>
                            <span style={{ opacity: 0.6, fontSize: 12, textAlign: "right", width: 70 }}>
                                {day.high}° / {day.low}°
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
