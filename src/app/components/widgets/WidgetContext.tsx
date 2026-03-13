"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
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

export type WidgetType = "weather" | "crypto" | "anime" | "focus" | "search"

export interface WidgetConfig {
    id: string
    type: WidgetType
    panel: "left" | "right"
    order: number
}

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

const STORAGE_KEY = "boss-mode-widget-config"

interface WidgetContextType {
    widgets: WidgetConfig[]
    isRearrangeMode: boolean
    toggleRearrangeMode: () => void
    addWidget: (type: WidgetType, panel: "left" | "right") => void
    removeWidget: (id: string) => void
    getWidgetsForPanel: (panel: "left" | "right") => WidgetConfig[]
    loaded: boolean
    activeId: string | null
}

const WidgetContext = createContext<WidgetContextType | null>(null)

export function useWidgets() {
    const ctx = useContext(WidgetContext)
    if (!ctx) throw new Error("useWidgets must be used within WidgetProvider")
    return ctx
}

export function WidgetProvider({ children }: { children: ReactNode }) {
    const [widgets, setWidgets] = useState<WidgetConfig[]>([])
    const [loaded, setLoaded] = useState(false)
    const [isRearrangeMode, setIsRearrangeMode] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)

    // DnD sensors
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 8 }
    })
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 200, tolerance: 5 }
    })
    const sensors = useSensors(pointerSensor, touchSensor)

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setWidgets(JSON.parse(saved))
            } catch {
                setWidgets(DEFAULT_WIDGETS)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WIDGETS))
            }
        } else {
            setWidgets(DEFAULT_WIDGETS)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WIDGETS))
        }
        setLoaded(true)
    }, [])

    const saveWidgets = useCallback((updated: WidgetConfig[]) => {
        setWidgets(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }, [])

    const getWidgetsForPanel = useCallback((panel: "left" | "right") => {
        return widgets
            .filter((w) => w.panel === panel)
            .sort((a, b) => a.order - b.order)
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

    const toggleRearrangeMode = useCallback(() => {
        setIsRearrangeMode(prev => !prev)
    }, [])

    // Determine which panel a widget ID belongs to
    const getPanelForWidget = useCallback((widgetId: string) => {
        return widgets.find(w => w.id === widgetId)?.panel
    }, [widgets])

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string)
    }, [])

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        const activePanel = getPanelForWidget(activeId)
        // overId can be a widget id OR a panel droppable id ("left-panel" or "right-panel")
        let overPanel: "left" | "right" | undefined
        if (overId === "left-panel") {
            overPanel = "left"
        } else if (overId === "right-panel") {
            overPanel = "right"
        } else {
            overPanel = getPanelForWidget(overId)
        }

        if (!activePanel || !overPanel || activePanel === overPanel) return

        // Widget is being dragged to the other panel — move it there
        setWidgets(prev => {
            const targetPanelWidgets = prev.filter(w => w.panel === overPanel && w.id !== activeId)
            const maxOrder = Math.max(-1, ...targetPanelWidgets.map(w => w.order))

            return prev.map(w => {
                if (w.id === activeId) {
                    return { ...w, panel: overPanel!, order: maxOrder + 1 }
                }
                return w
            })
        })
    }, [getPanelForWidget])

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveId(null)
        const { active, over } = event
        if (!over || active.id === over.id) {
            // Still save to persist any cross-panel moves that happened during dragOver
            localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        // If dropping onto a panel droppable (not another widget), just persist
        if (overId === "left-panel" || overId === "right-panel") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
            return
        }

        const activePanel = getPanelForWidget(activeId)
        const overPanel = getPanelForWidget(overId)

        // Reorder within the same panel
        if (activePanel && overPanel && activePanel === overPanel) {
            const panelWidgets = widgets
                .filter(w => w.panel === activePanel)
                .sort((a, b) => a.order - b.order)

            const oldIndex = panelWidgets.findIndex(w => w.id === activeId)
            const newIndex = panelWidgets.findIndex(w => w.id === overId)

            if (oldIndex >= 0 && newIndex >= 0) {
                const reordered = arrayMove(panelWidgets, oldIndex, newIndex)
                const updated = widgets.map(w => {
                    const reorderedIdx = reordered.findIndex(r => r.id === w.id)
                    if (reorderedIdx >= 0) {
                        return { ...w, order: reorderedIdx }
                    }
                    return w
                })
                saveWidgets(updated)
                return
            }
        }

        // Persist any state from cross-panel moves
        localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
    }, [widgets, getPanelForWidget, saveWidgets])

    return (
        <WidgetContext.Provider value={{
            widgets,
            isRearrangeMode,
            toggleRearrangeMode,
            addWidget,
            removeWidget,
            getWidgetsForPanel,
            loaded,
            activeId,
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
