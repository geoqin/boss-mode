"use client"

import { Task, RecurringTaskCompletion } from "@/app/types"
import { useMemo, useCallback } from "react"
import { useSwipeGesture } from "@/hooks/useSwipeGesture"
import { DayView } from "./DayView"
import { WeekView } from "./WeekView"
import { MonthView } from "./MonthView"

interface TimelineViewProps {
    tasks: Task[]
    recurringCompletions: RecurringTaskCompletion[]
    viewMode: 'day' | 'week' | 'month'
    selectedDate: Date
    hideRecurring: boolean
    sortBy: 'type' | 'priority' | 'due'
    sortOrder: 'asc' | 'desc'
    onDateChange: (date: Date) => void
    onViewModeChange: (mode: 'day' | 'week' | 'month') => void
    onToggle: (taskId: string, instanceDate?: string) => void
    onDelete: (id: string) => void
    onEdit: (task: Task, instanceDate?: string) => void
    onHideRecurringChange: (hide: boolean) => void
    theme: 'light' | 'dark'
}

export function TimelineView({
    tasks,
    recurringCompletions,
    viewMode,
    selectedDate,
    hideRecurring,
    sortBy,
    sortOrder,
    onDateChange,
    onViewModeChange,
    onToggle,
    onDelete,
    onEdit,
    onHideRecurringChange,
    theme
}: TimelineViewProps) {
    const isDark = theme === 'dark'

    // Filter tasks based on hideRecurring
    const filteredTasks = useMemo(() => {
        if (hideRecurring) {
            return tasks.filter(t => !t.recurrence)
        }
        return tasks
    }, [tasks, hideRecurring])

    // Swipe navigation
    const navigatePrev = useCallback(() => {
        const newDate = new Date(selectedDate)
        switch (viewMode) {
            case 'day':
                newDate.setDate(newDate.getDate() - 1)
                break
            case 'week':
                newDate.setDate(newDate.getDate() - 7)
                break
            case 'month':
                newDate.setMonth(newDate.getMonth() - 1)
                break
        }
        onDateChange(newDate)
    }, [selectedDate, viewMode, onDateChange])

    const navigateNext = useCallback(() => {
        const newDate = new Date(selectedDate)
        switch (viewMode) {
            case 'day':
                newDate.setDate(newDate.getDate() + 1)
                break
            case 'week':
                newDate.setDate(newDate.getDate() + 7)
                break
            case 'month':
                newDate.setMonth(newDate.getMonth() + 1)
                break
        }
        onDateChange(newDate)
    }, [selectedDate, viewMode, onDateChange])

    // Attach swipe handlers
    const swipeRef = useSwipeGesture<HTMLDivElement>({
        onSwipeLeft: navigateNext,
        onSwipeRight: navigatePrev
    })

    const commonProps = {
        tasks: filteredTasks,
        recurringCompletions,
        selectedDate,
        sortBy,
        sortOrder,
        hideRecurring,
        onToggle,
        onDelete,
        onEdit,
        onDateChange,
        onViewModeChange,
        onHideRecurringChange,
        isDark
    }

    const renderView = () => {
        switch (viewMode) {
            case 'day':
                return <DayView {...commonProps} />
            case 'week':
                return <WeekView {...commonProps} />
            case 'month':
                return <MonthView {...commonProps} />
            default:
                return <DayView {...commonProps} />
        }
    }

    return (
        <div ref={swipeRef} className="touch-pan-y">
            {renderView()}
        </div>
    )
}
