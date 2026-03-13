"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react"
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { createClient } from "@/lib/supabase/client"

export type WidgetType = "weather" | "crypto" | "anime" | "focus" | "search"

export interface WidgetConfig {
    id: string
    type: WidgetType
    panel: "left" | "right"
    order: number
}

// Additional specific preferences types
export interface SavedLocation {
    name: string
    lat: number
    lon: number
}

// Base Context State
export const WIDGET_META: Record<WidgetType, { label: string; emoji: string; description: string }> = {
    weather: { label: "Weather", emoji: "🌤️", description: "Current conditions & forecast" },
    crypto: { label: "Crypto", emoji: "📈", description: "Live cryptocurrency prices" },
    anime: { label: "Anime Tracker", emoji: "🎌", description: "Track anime episode releases" },
    focus: { label: "Focus Task", emoji: "🎯", description: "Your most pressing task" },
    search: { label: "Google Search", emoji: "🔍", description: "Quick web search" },
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
    { id: "weather-1", type: "weather", panel: "left", order: 0 },
    { id: "focus-1", type: "focus", panel: "left", order: 1 },
    { id: "crypto-1", type: "crypto", panel: "right", order: 0 },
    { id: "anime-1", type: "anime", panel: "right", order: 1 },
]

interface WidgetContextType {
    widgets: WidgetConfig[]
    isRearrangeMode: boolean
    toggleRearrangeMode: () => void
    addWidget: (type: WidgetType, panel: "left" | "right") => void
    removeWidget: (id: string) => void
    getWidgetsForPanel: (panel: "left" | "right") => WidgetConfig[]
    loaded: boolean
    activeId: string | null

    // Specific Widget States syncing to DB
    weatherLocation: SavedLocation | null
    setWeatherLocation: (loc: SavedLocation) => void
    cryptoCoins: string[]
    setCryptoCoins: (coins: string[]) => void
    animeTracked: any[] // Kept generic as we haven't touched anime deeply yet
    setAnimeTracked: (anime: any[]) => void
}

const WidgetContext = createContext<WidgetContextType | null>(null)

export function useWidgets() {
    const ctx = useContext(WidgetContext)
    if (!ctx) throw new Error("useWidgets must be used within WidgetProvider")
    return ctx
}

export function WidgetProvider({ children }: { children: ReactNode }) {
    const supabase = createClient()
    const [userId, setUserId] = useState<string | null>(null)
    const [loaded, setLoaded] = useState(false)

    // Layout State
    const [widgets, setWidgets] = useState<WidgetConfig[]>([])
    const [isRearrangeMode, setIsRearrangeMode] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)

    // Specific Widget States
    const [weatherLocation, setWeatherLocationState] = useState<SavedLocation | null>(null)
    const [cryptoCoins, setCryptoCoinsState] = useState<string[]>(["bitcoin", "ethereum", "solana"])
    const [animeTracked, setAnimeTrackedState] = useState<any[]>([])

    // Debounce timer for DB sync
    const syncTimerRef = useRef<NodeJS.Timeout | null>(null)

    // DnD sensors
    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
    const sensors = useSensors(pointerSensor, touchSensor)

    // 1. Initial Load from Supabase
    useEffect(() => {
        async function loadPreferences() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setWidgets(DEFAULT_WIDGETS)
                setLoaded(true)
                return
            }

            setUserId(user.id)
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (data) {
                setWidgets(data.widget_layout?.length ? data.widget_layout : DEFAULT_WIDGETS)
                if (data.weather_location) setWeatherLocationState(data.weather_location)
                if (data.crypto_coins?.length) setCryptoCoinsState(data.crypto_coins)
                if (data.anime_tracked?.length) setAnimeTrackedState(data.anime_tracked)
            } else {
                setWidgets(DEFAULT_WIDGETS)
                // If no row exists, we insert a default row later upon first save
            }
            setLoaded(true)
        }
        loadPreferences()
    }, [supabase])

    // 2. Debounced Sync to Supabase
    const syncToDatabase = useCallback((
        newWidgets: WidgetConfig[],
        newWeather: SavedLocation | null,
        newCrypto: string[],
        newAnime: any[]
    ) => {
        if (!userId) return

        if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
        syncTimerRef.current = setTimeout(async () => {
            const updates = {
                user_id: userId,
                widget_layout: newWidgets,
                weather_location: newWeather,
                crypto_coins: newCrypto,
                anime_tracked: newAnime
            }

            const { error } = await supabase
                .from('user_preferences')
                .upsert(updates)

            if (error) console.error("Failed to sync widget preferences:", error)
        }, 1000) // 1 second debounce
    }, [userId, supabase])

    // State updaters that also trigger sync
    const saveWidgets = useCallback((updated: WidgetConfig[]) => {
        setWidgets(updated)
        syncToDatabase(updated, weatherLocation, cryptoCoins, animeTracked)
    }, [weatherLocation, cryptoCoins, animeTracked, syncToDatabase])

    const setWeatherLocation = useCallback((loc: SavedLocation) => {
        setWeatherLocationState(loc)
        syncToDatabase(widgets, loc, cryptoCoins, animeTracked)
    }, [widgets, cryptoCoins, animeTracked, syncToDatabase])

    const setCryptoCoins = useCallback((coins: string[]) => {
        setCryptoCoinsState(coins)
        syncToDatabase(widgets, weatherLocation, coins, animeTracked)
    }, [widgets, weatherLocation, animeTracked, syncToDatabase])

    const setAnimeTracked = useCallback((anime: any[]) => {
        setAnimeTrackedState(anime)
        syncToDatabase(widgets, weatherLocation, cryptoCoins, anime)
    }, [widgets, weatherLocation, cryptoCoins, syncToDatabase])

    // Layout Actions
    const getWidgetsForPanel = useCallback((panel: "left" | "right") => {
        return widgets.filter((w) => w.panel === panel).sort((a, b) => a.order - b.order)
    }, [widgets])

    const addWidget = useCallback((type: WidgetType, panel: "left" | "right") => {
        const id = `${type}-${Date.now()}`
        const panelWidgets = widgets.filter(w => w.panel === panel)
        const maxOrder = Math.max(0, ...panelWidgets.map(w => w.order))
        const newWidget: WidgetConfig = { id, type, panel, order: maxOrder + 1 }
        saveWidgets([...widgets, newWidget])
    }, [widgets, saveWidgets])

    const removeWidget = useCallback((id: string) => {
        saveWidgets(widgets.filter(w => w.id !== id))
    }, [widgets, saveWidgets])

    const toggleRearrangeMode = useCallback(() => setIsRearrangeMode(prev => !prev), [])

    const getPanelForWidget = useCallback((widgetId: string) => {
        return widgets.find(w => w.id === widgetId)?.panel
    }, [widgets])

    // Drag handling
    const handleDragStart = useCallback((event: DragStartEvent) => setActiveId(event.active.id as string), [])

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        const activePanel = getPanelForWidget(activeId)
        let overPanel: "left" | "right" | undefined
        if (overId === "left-panel") overPanel = "left"
        else if (overId === "right-panel") overPanel = "right"
        else overPanel = getPanelForWidget(overId)

        if (!activePanel || !overPanel || activePanel === overPanel) return

        setWidgets(prev => {
            const targetPanelWidgets = prev.filter(w => w.panel === overPanel && w.id !== activeId)
            const maxOrder = Math.max(-1, ...targetPanelWidgets.map(w => w.order))
            return prev.map(w => w.id === activeId ? { ...w, panel: overPanel!, order: maxOrder + 1 } : w)
        })
    }, [getPanelForWidget])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveId(null)
        const { active, over } = event
        if (!over || active.id === over.id) {
            syncToDatabase(widgets, weatherLocation, cryptoCoins, animeTracked)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        if (overId === "left-panel" || overId === "right-panel") {
            syncToDatabase(widgets, weatherLocation, cryptoCoins, animeTracked)
            return
        }

        const activePanel = getPanelForWidget(activeId)
        const overPanel = getPanelForWidget(overId)

        if (activePanel && overPanel && activePanel === overPanel) {
            const panelWidgets = widgets.filter(w => w.panel === activePanel).sort((a, b) => a.order - b.order)
            const oldIndex = panelWidgets.findIndex(w => w.id === activeId)
            const newIndex = panelWidgets.findIndex(w => w.id === overId)

            if (oldIndex >= 0 && newIndex >= 0) {
                const reordered = arrayMove(panelWidgets, oldIndex, newIndex)
                const updated = widgets.map(w => {
                    const reorderedIdx = reordered.findIndex(r => r.id === w.id)
                    return reorderedIdx >= 0 ? { ...w, order: reorderedIdx } : w
                })
                saveWidgets(updated)
                return
            }
        }
        syncToDatabase(widgets, weatherLocation, cryptoCoins, animeTracked)
    }, [widgets, getPanelForWidget, saveWidgets, syncToDatabase, weatherLocation, cryptoCoins, animeTracked])

    return (
        <WidgetContext.Provider value={{
            widgets, isRearrangeMode, toggleRearrangeMode,
            addWidget, removeWidget, getWidgetsForPanel,
            loaded, activeId,
            weatherLocation, setWeatherLocation,
            cryptoCoins, setCryptoCoins,
            animeTracked, setAnimeTracked
        }}>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                {children}
            </DndContext>
        </WidgetContext.Provider>
    )
}
