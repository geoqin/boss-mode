"use client"

import { useState, useEffect, useMemo } from "react"
import { Task, RecurringTaskCompletion } from "@/app/types"
import { isInstanceCompleted } from "@/app/utils/taskUtils"
import { getEffectiveDate } from "@/app/utils/dateUtils"

interface FocusTaskWidgetProps {
    isDark: boolean
    tasks: Task[]
    recurringCompletions: RecurringTaskCompletion[]
    onToggleTask: (id: string, instanceDate?: string) => void
    dayStartHour: number
}

const PRIORITY_SCORE: Record<string, number> = { high: 3, medium: 2, low: 1 }

export function FocusTaskWidget({
    isDark,
    tasks,
    recurringCompletions,
    onToggleTask,
    dayStartHour,
}: FocusTaskWidgetProps) {
    const [manualTaskId, setManualTaskId] = useState<string | null>(null)
    const [showPicker, setShowPicker] = useState(false)

    const today = getEffectiveDate(dayStartHour)

    // Get incomplete tasks for today, sorted by priority
    const incompleteTasks = useMemo(() => {
        return tasks
            .filter((task) => {
                // Only show tasks that are relevant today
                if (task.recurrence) {
                    return !isInstanceCompleted(task.id, today, recurringCompletions)
                }
                if (task.completed) return false
                const dueDate = task.due_date?.split("T")[0]
                // Today, overdue, or no due date
                if (dueDate && dueDate > today) return false
                return true
            })
            .sort((a, b) => {
                const pA = PRIORITY_SCORE[a.priority || "medium"]
                const pB = PRIORITY_SCORE[b.priority || "medium"]
                if (pA !== pB) return pB - pA
                // Overdue tasks first
                const dateA = a.due_date?.split("T")[0] || "9999"
                const dateB = b.due_date?.split("T")[0] || "9999"
                return dateA.localeCompare(dateB)
            })
    }, [tasks, recurringCompletions, today])

    // Determine which task to show
    const focusTask = useMemo(() => {
        if (manualTaskId) {
            const manual = incompleteTasks.find((t) => t.id === manualTaskId)
            if (manual) return manual
            // Manual selection no longer valid, reset
            setManualTaskId(null)
        }
        return incompleteTasks[0] || null
    }, [incompleteTasks, manualTaskId])

    // Reset manual selection when the task gets completed
    useEffect(() => {
        if (manualTaskId && focusTask?.id !== manualTaskId) {
            setManualTaskId(null)
        }
    }, [focusTask, manualTaskId])

    const handleComplete = () => {
        if (!focusTask) return
        if (focusTask.recurrence) {
            onToggleTask(focusTask.id, today)
        } else {
            onToggleTask(focusTask.id)
        }
        setManualTaskId(null)
    }

    const textPrimary = isDark ? "#f5f5f7" : "#1a1a1a"
    const textMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"

    const priorityColors: Record<string, { color: string; bg: string; label: string }> = {
        high: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "High Priority" },
        medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "Medium" },
        low: { color: "#10b981", bg: "rgba(16,185,129,0.12)", label: "Low" },
    }

    if (!focusTask && incompleteTasks.length === 0) {
        return (
            <div className={`widget-card ${isDark ? "widget-focus-task" : "widget-card-light widget-focus-task-light"}`}>
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
                    🎯 Focus Task
                </div>
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>🎉</span>
                    <div style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>All done!</div>
                    <div style={{ fontSize: 12, color: textMuted, marginTop: 4 }}>No pressing tasks for today</div>
                </div>
            </div>
        )
    }

    const prio = priorityColors[focusTask?.priority || "medium"]

    return (
        <div className={`widget-card ${isDark ? "widget-focus-task" : "widget-card-light widget-focus-task-light"}`}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    🎯 Focus Task
                </div>
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 12, color: textMuted, padding: "2px 6px",
                    }}
                    title="Change focus task"
                >
                    {showPicker ? "✕" : "Change"}
                </button>
            </div>

            {/* Task picker dropdown */}
            {showPicker && (
                <div style={{
                    marginBottom: 12, maxHeight: 180, overflowY: "auto",
                    borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
                }}>
                    {incompleteTasks.map((task) => (
                        <button
                            key={task.id}
                            onClick={() => {
                                setManualTaskId(task.id)
                                setShowPicker(false)
                            }}
                            style={{
                                display: "flex", alignItems: "center", gap: 8, width: "100%",
                                padding: "8px 10px", background: task.id === focusTask?.id
                                    ? (isDark ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.06)")
                                    : "none",
                                border: "none", color: textPrimary, cursor: "pointer",
                                fontSize: 13, textAlign: "left", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"}`,
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)")}
                            onMouseOut={(e) => (e.currentTarget.style.background = task.id === focusTask?.id
                                ? (isDark ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.06)") : "none")}
                        >
                            <span style={{
                                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                                background: priorityColors[task.priority || "medium"].color,
                            }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {task.title}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Focus task display */}
            {focusTask && (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                    {/* Priority badge */}
                    <span style={{
                        fontSize: 10, padding: "2px 10px", borderRadius: 10,
                        background: prio.bg, color: prio.color, fontWeight: 600,
                        display: "inline-block", marginBottom: 10,
                    }}>
                        {prio.label}
                    </span>

                    {/* Task title */}
                    <div style={{
                        fontSize: 18, fontWeight: 700, color: textPrimary,
                        lineHeight: 1.3, marginBottom: 12,
                        wordBreak: "break-word",
                    }}>
                        {focusTask.title}
                    </div>

                    {/* Due date info */}
                    {focusTask.due_date && (
                        <div style={{ fontSize: 12, color: textMuted, marginBottom: 12 }}>
                            {focusTask.due_date.split("T")[0] < today ? "⚠️ Overdue" : `Due: ${focusTask.due_date.split("T")[0]}`}
                        </div>
                    )}

                    {/* Complete button */}
                    <button
                        onClick={handleComplete}
                        style={{
                            background: "linear-gradient(135deg, #f97316, #facc15)",
                            color: "white", border: "none", borderRadius: 10,
                            padding: "10px 28px", fontWeight: 600, fontSize: 14,
                            cursor: "pointer", transition: "all 0.2s ease",
                            boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
                        }}
                    >
                        ✓ Complete
                    </button>

                    {/* Remaining count */}
                    {incompleteTasks.length > 1 && (
                        <div style={{ fontSize: 11, color: textMuted, marginTop: 10 }}>
                            {incompleteTasks.length - 1} more task{incompleteTasks.length - 1 > 1 ? "s" : ""} remaining
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
