"use client"

import { Task, RecurringTaskCompletion } from "@/app/types"
import { useMemo } from "react"
import { isInstanceCompleted, getRecurringInstances } from "@/app/utils/taskUtils"
import { formatLocalDate } from "@/app/utils/dateUtils"
import { useDeleteConfirm } from "@/app/components/DeleteConfirmProvider"

interface WeekViewProps {
    tasks: Task[]
    recurringCompletions: RecurringTaskCompletion[]
    selectedDate: Date
    sortBy: 'type' | 'priority' | 'due'
    sortOrder: 'asc' | 'desc'
    hideRecurring?: boolean
    onToggle: (taskId: string, instanceDate?: string) => void
    onDelete: (id: string) => void
    onEdit: (task: Task, instanceDate?: string) => void
    onDateChange: (date: Date) => void
    onViewModeChange?: (mode: 'day' | 'week' | 'month') => void
    onHideRecurringChange?: (hide: boolean) => void
    isDark: boolean
}

interface WeekDay {
    date: Date
    dateStr: string
    dayName: string
    dayNum: number
    isToday: boolean
    isPast: boolean
}

export function WeekView({
    tasks,
    recurringCompletions,
    selectedDate,
    hideRecurring = false,
    onToggle,
    onDelete,
    onEdit,
    onDateChange,
    onViewModeChange,
    onHideRecurringChange,
    isDark
}: WeekViewProps) {
    const { confirmDelete } = useDeleteConfirm()
    const today = formatLocalDate(new Date())

    // Get the week's days (Sunday to Saturday)
    const weekDays = useMemo(() => {
        const days: WeekDay[] = []
        const weekStart = new Date(selectedDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())

        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart)
            date.setDate(date.getDate() + i)
            const dateStr = formatLocalDate(date)
            days.push({
                date,
                dateStr,
                dayName: date.toLocaleDateString(undefined, { weekday: 'short' }),
                dayNum: date.getDate(),
                isToday: dateStr === today,
                isPast: dateStr < today
            })
        }
        return days
    }, [selectedDate, today])

    // Get recurring tasks that appear this week
    const recurringTasks = useMemo(() => {
        return tasks.filter(t => t.recurrence).filter(task => {
            // Check if task has any instances in this week
            const weekStart = weekDays[0].date
            const weekEnd = weekDays[6].date
            const instances = getRecurringInstances(task, weekStart, weekEnd)
            return instances.length > 0
        })
    }, [tasks, weekDays])

    // Get one-off tasks grouped by day
    // Include: tasks with due_date in this week, tasks without due_date (show on today), overdue incomplete tasks (show on today)
    const oneOffTasksByDay = useMemo(() => {
        const byDay: Record<string, Task[]> = {}
        weekDays.forEach(day => {
            byDay[day.dateStr] = []
        })

        const todayStr = today
        const weekStartStr = weekDays[0].dateStr
        const weekEndStr = weekDays[6].dateStr

        tasks.filter(t => !t.recurrence).forEach(task => {
            const dueDate = task.due_date?.split('T')[0]

            if (dueDate) {
                // Task has a due date
                if (dueDate >= weekStartStr && dueDate <= weekEndStr) {
                    // Due date is within this week - add to that day
                    if (byDay[dueDate] !== undefined) {
                        byDay[dueDate].push(task)
                    }
                } else if (dueDate < todayStr && !task.completed) {
                    // Overdue and incomplete - show on today if today is in this week
                    if (byDay[todayStr] !== undefined) {
                        byDay[todayStr].push(task)
                    }
                }
            } else {
                // No due date - show on today if today is in this week and task is not completed
                if (!task.completed && byDay[todayStr] !== undefined) {
                    byDay[todayStr].push(task)
                }
            }
        })

        return byDay
    }, [tasks, weekDays, today])

    // Check if recurring task is completed for a day
    const isRecurringCompletedForDay = (taskId: string, dateStr: string) => {
        return isInstanceCompleted(taskId, dateStr, recurringCompletions)
    }

    // Check if recurring task has instance on a day
    const hasInstanceOnDay = (task: Task, dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00')
        const instances = getRecurringInstances(task, date, date)
        return instances.includes(dateStr)
    }

    const cellClass = isDark
        ? "border-white/10"
        : "border-gray-200"

    const headerClass = isDark
        ? "bg-white/5 text-white/60"
        : "bg-gray-50 text-gray-600"

    // Group one-off tasks by date with priority sorting within each group
    const tasksByDate = useMemo(() => {
        const priorityScore = { high: 3, medium: 2, low: 1 }
        const result: { dateStr: string; dayLabel: string; tasks: { task: Task; dateStr: string }[] }[] = []

        // Get unique dates sorted
        const dates = Object.keys(oneOffTasksByDay).sort()

        dates.forEach(dateStr => {
            const dayTasks = oneOffTasksByDay[dateStr]
            if (dayTasks.length === 0) return

            // Sort tasks by priority (high first)
            const sortedTasks = [...dayTasks].sort((a, b) => {
                const pA = priorityScore[a.priority || 'medium']
                const pB = priorityScore[b.priority || 'medium']
                return pB - pA // High first
            })

            // Get day label
            const day = weekDays.find(d => d.dateStr === dateStr)
            let dayLabel = day ? `${day.dayName} ${day.dayNum}` : dateStr

            // Add special labels
            if (day?.isToday) {
                dayLabel = `Today (${dayLabel})`
            } else if (dateStr < today && day) {
                dayLabel = `${dayLabel} - Overdue`
            }

            result.push({
                dateStr,
                dayLabel,
                tasks: sortedTasks.map(task => ({ task, dateStr }))
            })
        })

        return result
    }, [oneOffTasksByDay, weekDays, today])

    const hasOneOffTasks = tasksByDate.some(g => g.tasks.length > 0)

    return (
        <div className="space-y-4">
            {/* Hide Recurring Toggle - aligned right */}
            {onHideRecurringChange && (
                <div className="flex justify-end">
                    <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        Hide recurring
                        <input
                            type="checkbox"
                            checked={hideRecurring}
                            onChange={(e) => onHideRecurringChange(e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                    </label>
                </div>
            )}

            {/* Recurring Tasks Table */}
            {!hideRecurring && recurringTasks.length > 0 && (
                <div className="overflow-x-auto">
                    <table className={`w-full border-collapse text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                        <thead>
                            <tr>
                                <th className={`p-2 text-left border ${cellClass} ${headerClass} w-32`}>Task</th>
                                {weekDays.map(day => (
                                    <th
                                        key={day.dateStr}
                                        className={`p-2 text-center border ${cellClass} ${headerClass} cursor-pointer hover:opacity-80 transition-opacity min-w-[60px]
                                            ${day.isToday ? (isDark ? 'bg-purple-500/20' : 'bg-purple-100') : ''}`}
                                        onClick={() => {
                                            onDateChange(day.date)
                                            onViewModeChange?.('day')
                                        }}
                                    >
                                        <div className={`text-xs ${day.isToday ? (isDark ? 'text-purple-300' : 'text-purple-700') : ''}`}>
                                            {day.dayName}
                                        </div>
                                        <div className={`font-bold ${day.isToday ? (isDark ? 'text-purple-300' : 'text-purple-700') : ''}`}>
                                            {day.dayNum}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recurringTasks.map(task => (
                                <tr key={task.id}>
                                    <td
                                        className={`p-2 border ${cellClass} font-medium truncate max-w-[120px] cursor-pointer hover:opacity-80`}
                                        onClick={() => onEdit(task)}
                                        title={task.title}
                                    >
                                        {task.title}
                                    </td>
                                    {weekDays.map(day => {
                                        const hasInstance = hasInstanceOnDay(task, day.dateStr)
                                        const isCompleted = hasInstance && isRecurringCompletedForDay(task.id, day.dateStr)
                                        const canToggle = hasInstance

                                        return (
                                            <td
                                                key={day.dateStr}
                                                className={`p-2 text-center border ${cellClass} 
                                                    ${day.isToday ? (isDark ? 'bg-purple-500/10' : 'bg-purple-50') : ''}
                                                    ${!hasInstance ? 'opacity-30' : ''}`}
                                            >
                                                {hasInstance && (
                                                    <button
                                                        onClick={() => canToggle && onToggle(task.id, day.dateStr)}
                                                        disabled={!canToggle}
                                                        className={`w-6 h-6 rounded border-2 transition-all
                                                            ${isCompleted
                                                                ? (isDark ? 'bg-gradient-to-br from-orange-500 to-yellow-400 border-transparent' : 'bg-green-500 border-green-500')
                                                                : (isDark ? 'border-white/30 hover:border-white/50' : 'border-gray-300 hover:border-gray-400')}
                                                            ${!canToggle ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                        title={isCompleted ? 'Completed' : canToggle ? 'Mark complete' : 'Cannot modify past'}
                                                    >
                                                        {isCompleted && <span className="text-white text-xs">✓</span>}
                                                    </button>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* One-off Tasks List - grouped by date, sorted by priority */}
            {hasOneOffTasks && (
                <div className="space-y-4">
                    <h3 className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-2`}>
                        📝 Tasks
                    </h3>
                    {tasksByDate.map(({ dateStr, dayLabel, tasks }) => (
                        <div key={dateStr} className="space-y-2">
                            {/* Date Subheading */}
                            <h4 className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'} flex items-center gap-2`}>
                                📅 {dayLabel}
                            </h4>
                            {tasks.map(({ task, dateStr: taskDateStr }) => {
                                const day = weekDays.find(d => d.dateStr === taskDateStr)
                                const isOverdue = !task.completed && task.due_date && task.due_date.split('T')[0] < today

                                return (
                                    <div
                                        key={task.id}
                                        className={`${isDark
                                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                            : 'bg-white border-gray-200 hover:shadow-md'} 
                                            border rounded-xl p-4 transition-all duration-300 flex items-center gap-4
                                            ${task.completed ? 'opacity-60' : ''}`}
                                    >
                                        {/* Checkbox */}
                                        <div
                                            className="flex-shrink-0 p-2 -m-2"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (day) {
                                                    onToggle(task.id, taskDateStr)
                                                }
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={task.completed}
                                                onChange={() => { }}
                                                className={`checkbox-custom pointer-events-none ${isDark ? 'checkbox-dark' : 'checkbox-light'}`}
                                                disabled={false}
                                            />
                                        </div>

                                        {/* Task content - clickable to edit */}
                                        <div
                                            className="flex flex-col flex-1 min-w-0 cursor-pointer"
                                            onClick={() => onEdit(task, taskDateStr)}
                                        >
                                            <span className={`block font-medium truncate ${isDark ? 'text-white/90' : 'text-gray-900'} ${task.completed ? 'line-through' : ''}`}>
                                                {task.title}
                                            </span>
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                {isOverdue && (
                                                    <span className="text-xs text-red-400">
                                                        ⚠️ Overdue
                                                    </span>
                                                )}
                                                {task.priority && task.priority !== 'medium' && (
                                                    <span className={`text-xs ${task.priority === 'high' ? 'text-orange-400' : 'text-blue-400'}`}>
                                                        {task.priority === 'high' ? '🔥' : '💤'} {task.priority}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Delete button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                confirmDelete(task.title, () => onDelete(task.id))
                                            }}
                                            className={`flex-shrink-0 p-1 rounded-full transition-colors
                                                ${isDark
                                                    ? 'text-white/30 hover:text-red-400 hover:bg-red-500/10'
                                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                            title="Delete task"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {(hideRecurring || recurringTasks.length === 0) && !hasOneOffTasks && (
                <div className={`text-center py-12 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    <div className="text-4xl mb-4">📅</div>
                    <p className="text-lg font-medium mb-1">No tasks this week</p>
                    <p className="text-sm opacity-75">Add tasks to see them here</p>
                </div>
            )}
        </div>
    )
}
