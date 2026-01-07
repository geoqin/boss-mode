"use client"

import { Task, RecurringTaskCompletion } from "@/app/types"
import { useMemo } from "react"
import { isInstanceCompleted, getRecurringInstances } from "@/app/utils/taskUtils"
import { formatLocalDate } from "@/app/utils/dateUtils"

interface MonthViewProps {
    tasks: Task[]
    recurringCompletions: RecurringTaskCompletion[]
    selectedDate: Date
    sortBy: 'type' | 'priority' | 'due'
    sortOrder: 'asc' | 'desc'
    onToggle: (taskId: string, instanceDate?: string) => void
    onDelete: (id: string) => void
    onEdit: (task: Task, instanceDate?: string) => void
    onDateChange: (date: Date) => void
    onViewModeChange?: (mode: 'day' | 'week' | 'month') => void
    isDark: boolean
}

interface DayCell {
    date: Date
    dateStr: string
    dayNum: number
    isCurrentMonth: boolean
    isToday: boolean
    totalTasks: number
    completedTasks: number
    completionPercent: number
}

export function MonthView({
    tasks,
    recurringCompletions,
    selectedDate,
    onDateChange,
    onViewModeChange,
    isDark
}: MonthViewProps) {
    const today = formatLocalDate(new Date())

    // Generate calendar grid (6 weeks x 7 days)
    const calendarDays = useMemo(() => {
        const days: DayCell[] = []
        const year = selectedDate.getFullYear()
        const month = selectedDate.getMonth()

        // First day of the month
        const firstDay = new Date(year, month, 1)
        // Start from the Sunday of the week containing the first day
        const startDate = new Date(firstDay)
        startDate.setDate(startDate.getDate() - firstDay.getDay())

        // Generate 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate)
            date.setDate(date.getDate() + i)
            const dateStr = formatLocalDate(date)
            const isCurrentMonth = date.getMonth() === month

            // Calculate task completion for this day
            let totalTasks = 0
            let completedTasks = 0

            tasks.forEach(task => {
                if (task.recurrence) {
                    // Check if recurring task has instance on this day
                    const instances = getRecurringInstances(task, date, date)
                    if (instances.includes(dateStr)) {
                        totalTasks++
                        if (isInstanceCompleted(task.id, dateStr, recurringCompletions)) {
                            completedTasks++
                        }
                    }
                } else {
                    // One-off task - match DayView logic
                    const dueDate = task.due_date?.split('T')[0]
                    const completedDate = task.completed_at?.split('T')[0]
                    const isTodayCell = dateStr === today

                    // Task due on this day - always count
                    if (dueDate === dateStr) {
                        totalTasks++
                        if (task.completed) {
                            completedTasks++
                        }
                    }
                    // Task completed today (different due date) - count on today only
                    else if (isTodayCell && task.completed && completedDate === dateStr) {
                        totalTasks++
                        completedTasks++
                    }
                    // No due date - count on today if not completed or completed today
                    else if (isTodayCell && !dueDate) {
                        if (!task.completed || completedDate === dateStr) {
                            totalTasks++
                            if (task.completed) completedTasks++
                        }
                    }
                    // Overdue - count on today if not completed
                    else if (isTodayCell && dueDate && dueDate < dateStr && !task.completed) {
                        totalTasks++
                    }
                }
            })

            // Future days should appear as "no tasks" (grey) to avoid red warnings
            // We use -1 percent to trigger the grey color
            // Logic: If date is in future (> today), percent is -1.
            const isFuture = dateStr > today

            days.push({
                date,
                dateStr,
                dayNum: date.getDate(),
                isCurrentMonth,
                isToday: dateStr === today,
                totalTasks,
                completedTasks,
                completionPercent: (isFuture || totalTasks === 0) ? -1 : (completedTasks / totalTasks) * 100
            })
        }

        return days
    }, [tasks, recurringCompletions, selectedDate, today])

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const getCompletionColor = (percent: number): string => {
        if (percent < 0) return isDark ? 'bg-white/5' : 'bg-gray-50' // No tasks or Future
        if (percent === 100) return isDark ? 'bg-green-600/60' : 'bg-green-200'
        if (percent >= 75) return isDark ? 'bg-lime-600/60' : 'bg-lime-200'
        if (percent >= 50) return isDark ? 'bg-yellow-400/60' : 'bg-yellow-200'
        if (percent >= 25) return isDark ? 'bg-orange-400/60' : 'bg-orange-200'
        if (percent > 0) return isDark ? 'bg-orange-700/60' : 'bg-orange-300' // Warm orange < 25%
        return isDark ? 'bg-red-600/60' : 'bg-red-200' // 0% strictly
    }

    const getCompletionBorder = (percent: number): string => {
        if (percent < 0) return ''
        if (percent === 100) return isDark ? 'border-green-500/50' : 'border-green-400'
        if (percent >= 75) return isDark ? 'border-lime-500/50' : 'border-lime-400'
        if (percent >= 50) return isDark ? 'border-yellow-400/50' : 'border-yellow-400'
        if (percent >= 25) return isDark ? 'border-orange-400/50' : 'border-orange-300'
        if (percent > 0) return isDark ? 'border-orange-600/50' : 'border-orange-400'
        return isDark ? 'border-red-500/50' : 'border-red-400'
    }

    return (
        <div className="select-none">
            {/* Week day headers */}
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(day => (
                    <div
                        key={day}
                        className={`text-center text-xs font-semibold py-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            onDateChange(day.date)
                            onViewModeChange?.('day')
                        }}
                        className={`
                            aspect-square p-1 rounded-lg border transition-all
                            ${getCompletionColor(day.completionPercent)}
                            ${day.isToday
                                ? (isDark ? 'ring-2 ring-purple-500' : 'ring-2 ring-purple-400')
                                : (day.totalTasks > 0 ? `border ${getCompletionBorder(day.completionPercent)}` : 'border-transparent')}
                            ${day.isCurrentMonth ? '' : 'opacity-40'}
                            hover:opacity-80 cursor-pointer
                        `}
                    >
                        <div className={`text-sm font-medium ${day.isToday
                            ? (isDark ? 'text-purple-300' : 'text-purple-700')
                            : (isDark ? 'text-white/80' : 'text-gray-700')}`}
                        >
                            {day.dayNum}
                        </div>
                        {day.totalTasks > 0 && (
                            <div className={`text-[10px] mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                {day.completedTasks}/{day.totalTasks}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Legend */}
            {/* Legend */}
            <div className={`flex flex-wrap items-center justify-center gap-3 mt-4 text-[10px] sm:text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${isDark ? 'bg-green-600/60' : 'bg-green-200'}`} />
                    <span>100%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${isDark ? 'bg-lime-600/60' : 'bg-lime-200'}`} />
                    <span>75-99%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${isDark ? 'bg-yellow-400/60' : 'bg-yellow-200'}`} />
                    <span>50-74%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${isDark ? 'bg-orange-400/60' : 'bg-orange-200'}`} />
                    <span>25-49%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${isDark ? 'bg-orange-700/60' : 'bg-orange-300'}`} />
                    <span>&lt;25%</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded ${isDark ? 'bg-red-600/60' : 'bg-red-200'}`} />
                    <span>0%</span>
                </div>
            </div>
        </div>
    )
}
