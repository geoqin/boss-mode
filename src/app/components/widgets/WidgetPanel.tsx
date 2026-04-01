"use client"

import { useState } from "react"
import { Task, RecurringTaskCompletion } from "@/app/types"
import { WeatherWidget } from "./WeatherWidget"
import { CryptoWidget } from "./CryptoWidget"
import { AnimeWidget } from "./AnimeWidget"
import { FocusTaskWidget } from "./FocusTaskWidget"
import { GoogleSearchWidget } from "./GoogleSearchWidget"
import { ListsWidget } from "./ListsWidget"
import { SortableWidget } from "./SortableWidget"
import { useWidgets, WIDGET_META, WidgetType, WidgetConfig } from "./WidgetContext"
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface WidgetPanelProps {
    side: "left" | "right"
    isDark: boolean
    tasks: Task[]
    recurringCompletions: RecurringTaskCompletion[]
    onToggleTask: (id: string, instanceDate?: string) => void
    dayStartHour: number
}

export function WidgetPanel({
    side,
    isDark,
    tasks,
    recurringCompletions,
    onToggleTask,
    dayStartHour,
}: WidgetPanelProps) {
    const { getWidgetsForPanel, isRearrangeMode, addWidget, removeWidget, loaded } = useWidgets()
    const [showPicker, setShowPicker] = useState(false)

    const panelWidgets = getWidgetsForPanel(side)

    // Register as a droppable zone for cross-panel dragging
    const { setNodeRef, isOver } = useDroppable({
        id: `${side}-panel`,
        disabled: !isRearrangeMode,
    })

    const renderWidget = (config: WidgetConfig) => {
        switch (config.type) {
            case "weather":
                return <WeatherWidget isDark={isDark} />
            case "crypto":
                return <CryptoWidget isDark={isDark} />
            case "anime":
                return <AnimeWidget isDark={isDark} />
            case "search":
                return <GoogleSearchWidget isDark={isDark} />
            case "lists":
                return <ListsWidget isDark={isDark} />
            case "focus":
                return (
                    <FocusTaskWidget
                        isDark={isDark}
                        tasks={tasks}
                        recurringCompletions={recurringCompletions}
                        onToggleTask={onToggleTask}
                        dayStartHour={dayStartHour}
                    />
                )
            default:
                return null
        }
    }

    const usedTypes = new Set(panelWidgets.map((w) => w.type))
    const availableTypes = (Object.keys(WIDGET_META) as WidgetType[]).filter((t) => !usedTypes.has(t))

    const textMuted = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"
    const textPrimary = isDark ? "#f5f5f7" : "#1a1a1a"

    if (!loaded) return null

    return (
        <div
            ref={setNodeRef}
            className={`widget-panel ${side === "left" ? "widget-panel-left" : "widget-panel-right"}`}
            style={{
                outline: isRearrangeMode && isOver ? `2px dashed rgba(249,115,22,0.4)` : 'none',
                outlineOffset: '-2px',
                borderRadius: 12,
                transition: 'outline 0.2s ease',
            }}
        >
            <SortableContext
                items={panelWidgets.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
            >
                {panelWidgets.map((config) => (
                    <SortableWidget
                        key={config.id}
                        id={config.id}
                        isRearrangeMode={isRearrangeMode}
                    >
                        <div style={{ position: "relative" }}>
                            {isRearrangeMode && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        removeWidget(config.id)
                                    }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    style={{
                                        position: "absolute", top: 6, right: 6, zIndex: 10,
                                        background: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                                        border: "none", borderRadius: "50%",
                                        width: 24, height: 24,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: "pointer", fontSize: 12,
                                        color: isDark ? "#f87171" : "#ef4444",
                                        transition: "all 0.2s",
                                    }}
                                    title="Remove widget"
                                >
                                    ✕
                                </button>
                            )}
                            {renderWidget(config)}
                        </div>
                    </SortableWidget>
                ))}
            </SortableContext>

            {/* Add widget — in rearrange mode or empty panel */}
            {availableTypes.length > 0 && (isRearrangeMode || panelWidgets.length === 0) && (
                <div style={{ position: "relative" }}>
                    <button
                        className={`widget-add-btn ${isDark ? "" : "widget-add-btn-light"}`}
                        onClick={() => setShowPicker(!showPicker)}
                    >
                        {showPicker ? "Cancel" : "+ Add Widget"}
                    </button>

                    {showPicker && (
                        <div
                            style={{
                                marginTop: 8, borderRadius: 12, overflow: "hidden",
                                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                                background: isDark ? "rgba(30,30,30,0.95)" : "rgba(255,255,255,0.95)",
                                backdropFilter: "blur(12px)",
                            }}
                        >
                            {availableTypes.map((type) => {
                                const meta = WIDGET_META[type]
                                return (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            addWidget(type, side)
                                            setShowPicker(false)
                                        }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 10, width: "100%",
                                            padding: "10px 14px", background: "none", border: "none",
                                            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                                            color: textPrimary, cursor: "pointer", textAlign: "left",
                                            transition: "background 0.2s",
                                        }}
                                        onMouseOver={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)")}
                                        onMouseOut={(e) => (e.currentTarget.style.background = "none")}
                                    >
                                        <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.label}</div>
                                            <div style={{ fontSize: 11, color: textMuted }}>{meta.description}</div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
