"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useWidgets, SavedLocation } from "./WidgetContext"

interface WeatherData {
    temperature: number
    apparentTemperature: number
    weatherCode: number
    windSpeed: number
    humidity: number
    isDay: boolean
    dailyHigh: number
    dailyLow: number
    todayPrecipMax: number
    forecast: { date: string; high: number; low: number; code: number; precipMax: number }[]
    hourlyPrecipitation: { hour: number; probability: number; weatherCode: number }[]
    forecastHourlyPrecip: Record<string, { hour: number; probability: number; weatherCode: number }[]>
}

interface GeoResult {
    place_id: number
    name: string
    display_name: string
    lat: string
    lon: string
    address?: {
        suburb?: string
        city?: string
        town?: string
        village?: string
        state?: string
        country?: string
    }
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
    const { weatherLocation: savedLocation, setWeatherLocation } = useWidgets()
    const [weather, setWeather] = useState<WeatherData | null>(null)
    const [loading, setLoading] = useState(true)
    const [locationName, setLocationName] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [showSearch, setShowSearch] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<GeoResult[]>([])
    const [searchLoading, setSearchLoading] = useState(false)

    const [expandedDay, setExpandedDay] = useState<string | null>(null)
    const [showTodayGraph, setShowTodayGraph] = useState(false)
    const [hoveredBar, setHoveredBar] = useState<{ hour: number; probability: number; weatherCode: number; x: number } | null>(null)
    const graphRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

    const fetchWeather = useCallback(async (lat: number, lon: number) => {
        try {
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day&hourly=precipitation_probability,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=auto&forecast_days=4`
            )
            const data = await res.json()

            // Extract hourly precipitation per day
            const now = new Date()
            const currentHour = now.getHours()
            const hourlyPrecip: { hour: number; probability: number; weatherCode: number }[] = []
            const forecastHourlyPrecip: Record<string, { hour: number; probability: number; weatherCode: number }[]> = {}
            const times: string[] = data.hourly.time
            const probs: number[] = data.hourly.precipitation_probability
            const codes: number[] = data.hourly.weather_code
            const todayStr = data.daily.time[0]
            for (let i = 0; i < times.length; i++) {
                const dateStr = times[i].substring(0, 10)
                const hour = new Date(times[i]).getHours()
                if (dateStr === todayStr) {
                    if (hour >= currentHour) {
                        hourlyPrecip.push({ hour, probability: probs[i], weatherCode: codes[i] })
                    }
                } else {
                    if (!forecastHourlyPrecip[dateStr]) forecastHourlyPrecip[dateStr] = []
                    forecastHourlyPrecip[dateStr].push({ hour, probability: probs[i], weatherCode: codes[i] })
                }
            }

            setWeather({
                temperature: Math.round(data.current.temperature_2m),
                apparentTemperature: Math.round(data.current.apparent_temperature),
                weatherCode: data.current.weather_code,
                windSpeed: Math.round(data.current.wind_speed_10m),
                humidity: data.current.relative_humidity_2m,
                isDay: data.current.is_day === 1,
                dailyHigh: Math.round(data.daily.temperature_2m_max[0]),
                dailyLow: Math.round(data.daily.temperature_2m_min[0]),
                todayPrecipMax: data.daily.precipitation_probability_max[0],
                forecast: data.daily.time.slice(1).map((date: string, i: number) => ({
                    date,
                    high: Math.round(data.daily.temperature_2m_max[i + 1]),
                    low: Math.round(data.daily.temperature_2m_min[i + 1]),
                    code: data.daily.weather_code[i + 1],
                    precipMax: data.daily.precipitation_probability_max[i + 1],
                })),
                hourlyPrecipitation: hourlyPrecip,
                forecastHourlyPrecip,
            })
            setError(null)
            setLoading(false)
        } catch {
            setError("Failed to load weather")
            setLoading(false)
        }
    }, [])

    // Load weather based on context location or geolocation
    useEffect(() => {
        if (savedLocation) {
            setLocationName(`📍 ${savedLocation.name}`)
            fetchWeather(savedLocation.lat, savedLocation.lon)
            return
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
    }, [fetchWeather, savedLocation])

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
                const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
                const data = await res.json()
                setSearchResults(data || [])
            } catch {
                setSearchResults([])
            } finally {
                setSearchLoading(false)
            }
        }, 300)
    }

    const selectLocation = (result: GeoResult) => {
        let shortName = result.name

        if (result.address) {
            const addr = result.address
            const locality = addr.suburb || addr.city || addr.town || addr.village || result.name
            const region = addr.state || addr.country || ""
            shortName = region ? `${locality}, ${region}` : locality
        } else {
            // Fallback for no address details
            const parts = result.display_name.split(",").map((p: string) => p.trim())
            shortName = parts.length > 3 
                ? `${parts[0]}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}`
                : result.display_name
        }

        const loc: SavedLocation = { name: shortName, lat: parseFloat(result.lat), lon: parseFloat(result.lon) }
        setWeatherLocation(loc)
        setLocationName(`📍 ${shortName}`)

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
                                    key={r.place_id}
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
                                    <div style={{ fontWeight: 600 }}>{r.address?.suburb || r.address?.city || r.address?.town || r.name}</div>
                                    <div style={{ fontSize: 11, color: textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {[r.address?.state, r.address?.country].filter(Boolean).join(", ") || r.display_name}
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

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{info.label}</span>
                <button
                    onClick={() => setShowTodayGraph(!showTodayGraph)}
                    style={{
                        background: isDark ? "rgba(100,180,255,0.15)" : "rgba(30,120,220,0.1)",
                        border: "none", borderRadius: 10, padding: "2px 8px",
                        fontSize: 12, cursor: "pointer", color: "inherit",
                        opacity: showTodayGraph ? 0.9 : 0.6,
                        transition: "opacity 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "0.9")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = showTodayGraph ? "0.9" : "0.6")}
                >
                    🌧️ {weather.todayPrecipMax}%
                </button>
            </div>

            {/* Details row */}
            <div style={{ display: "flex", gap: 16, fontSize: 12, opacity: 0.6, marginBottom: 12 }}>
                <span>H: {weather.dailyHigh}° L: {weather.dailyLow}°</span>
                <span>💨 {weather.windSpeed} km/h</span>
                <span>💧 {weather.humidity}%</span>
            </div>

            {/* Today's hourly precipitation graph (toggle) */}
            {showTodayGraph && weather.hourlyPrecipitation.length > 0 && (
                <div style={{ marginBottom: 12, position: "relative" }}
                    onMouseLeave={() => setHoveredBar(null)}
                >
                    {hoveredBar && (
                        <div style={{
                            position: "absolute",
                            left: Math.min(Math.max(hoveredBar.x - 28, 0), 200),
                            top: -4,
                            background: isDark ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.97)",
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: textPrimary,
                            pointerEvents: "none",
                            whiteSpace: "nowrap",
                            zIndex: 10,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        }}>
                            {hoveredBar.hour}:00 — {getWeatherInfo(hoveredBar.weatherCode).label} — {hoveredBar.probability}%
                        </div>
                    )}
                    <div ref={graphRef} style={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                        {weather.hourlyPrecipitation.map((h, idx) => (
                            <div
                                key={h.hour}
                                onMouseEnter={(e) => {
                                    const rect = graphRef.current?.getBoundingClientRect()
                                    const barRect = e.currentTarget.getBoundingClientRect()
                                    const x = rect ? barRect.left - rect.left + barRect.width / 2 : 0
                                    setHoveredBar({ hour: h.hour, probability: h.probability, weatherCode: h.weatherCode, x })
                                }}
                                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}
                            >
                                <div style={{ fontSize: 9, lineHeight: 1, marginBottom: 2, opacity: idx % 4 === 0 ? 1 : 0 }}>
                                    {getWeatherInfo(h.weatherCode).emoji}
                                </div>
                                <div style={{
                                    width: "100%",
                                    height: Math.max((h.probability / 100) * 28, 3),
                                    background: isDark
                                        ? `rgba(100,180,255,${h.probability > 0 ? 0.3 + (h.probability / 100) * 0.7 : 0.12})`
                                        : `rgba(30,120,220,${h.probability > 0 ? 0.2 + (h.probability / 100) * 0.6 : 0.08})`,
                                    borderRadius: "2px 2px 0 0",
                                    transition: "height 0.3s ease",
                                }} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, opacity: 0.4, marginTop: 2 }}>
                        <span>{weather.hourlyPrecipitation[0].hour}:00</span>
                        {weather.hourlyPrecipitation.length > 4 && (
                            <span>{weather.hourlyPrecipitation[Math.floor(weather.hourlyPrecipitation.length / 2)].hour}:00</span>
                        )}
                        <span>{weather.hourlyPrecipitation[weather.hourlyPrecipitation.length - 1].hour}:00</span>
                    </div>
                </div>
            )}

            {/* 3-day forecast */}
            <div style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`, paddingTop: 8 }}>
                {weather.forecast.map((day) => {
                    const dayInfo = getWeatherInfo(day.code)
                    const isExpanded = expandedDay === day.date
                    const dayHourly = weather.forecastHourlyPrecip[day.date] || []
                    return (
                        <div key={day.date}>
                            <div
                                onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                                style={{
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    padding: "4px 0", fontSize: 13,
                                    cursor: "pointer",
                                    transition: "opacity 0.15s",
                                }}
                            >
                                <span style={{ width: 70 }}>{getDayName(day.date)}</span>
                                <span>{dayInfo.emoji}</span>
                                <span style={{ opacity: 0.5, fontSize: 11 }}>
                                    💧{day.precipMax}%
                                </span>
                                <span style={{ opacity: 0.6, fontSize: 12, textAlign: "right", width: 70, marginLeft: "auto" }}>
                                    {day.high}° / {day.low}°
                                </span>
                            </div>
                            {isExpanded && dayHourly.length > 0 && (
                                <div style={{ padding: "4px 0 8px", overflow: "hidden" }}>
                                    <div style={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                                        {dayHourly.map((h, idx) => (
                                            <div
                                                key={h.hour}
                                                title={`${h.hour}:00 — ${getWeatherInfo(h.weatherCode).label} — ${h.probability}%`}
                                                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
                                            >
                                                <div style={{ fontSize: 8, lineHeight: 1, marginBottom: 1, opacity: idx % 4 === 0 ? 1 : 0 }}>
                                                    {getWeatherInfo(h.weatherCode).emoji}
                                                </div>
                                                <div style={{
                                                    width: "100%",
                                                    height: Math.max((h.probability / 100) * 22, 2),
                                                    background: isDark
                                                        ? `rgba(100,180,255,${h.probability > 0 ? 0.3 + (h.probability / 100) * 0.7 : 0.08})`
                                                        : `rgba(30,120,220,${h.probability > 0 ? 0.2 + (h.probability / 100) * 0.6 : 0.06})`,
                                                    borderRadius: "1px 1px 0 0",
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, opacity: 0.35, marginTop: 1 }}>
                                        <span>0:00</span>
                                        <span>12:00</span>
                                        <span>23:00</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
