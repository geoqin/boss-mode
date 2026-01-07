"use client"

import { Task, RecurringTaskCompletion } from "@/app/types"
import { useMemo, Fragment } from "react"
import { useDeleteConfirm } from "@/app/components/DeleteConfirmProvider"
import { isInstanceCompleted, getRecurringInstances } from "@/app/utils/taskUtils"
import { formatLocalDate } from "@/app/utils/dateUtils"

interface DayViewProps {
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
    onHideRecurringChange?: (hide: boolean) => void
    isDark: boolean
}

interface DayTask {
    task: Task
    isCompleted: boolean
    isRecurring: boolean
    instanceDate: string
}

interface TaskGroup {
    key: string
    label: string
    emoji: string
    tasks: DayTask[]
}

export function DayView({
    tasks,
    recurringCompletions,
    selectedDate,
    sortBy,
    sortOrder,
    hideRecurring = false,
    onToggle,
    onDelete,
    onEdit,
    onHideRecurringChange,
    isDark
}: DayViewProps) {
    const { confirmDelete } = useDeleteConfirm()
    const dateStr = formatLocalDate(selectedDate)
    const today = formatLocalDate(new Date())
    const isToday = dateStr === today
    const isPast = dateStr < today

    // Get tasks for this specific day
    const dayTasks = useMemo(() => {
        const result: DayTask[] = []

        tasks.forEach(task => {
            if (task.recurrence) {
                const instances = getRecurringInstances(task, selectedDate, selectedDate)
                if (instances.includes(dateStr)) {
                    result.push({
                        task,
                        isCompleted: isInstanceCompleted(task.id, dateStr, recurringCompletions),
                        isRecurring: true,
                        instanceDate: dateStr
                    })
                }
            } else {
                const dueDate = task.due_date?.split('T')[0]
                const completedDate = task.completed_at?.split('T')[0]

                // Task is due on this day - always show (completed or not)
                if (dueDate === dateStr) {
                    result.push({
                        task,
                        isCompleted: task.completed,
                        isRecurring: false,
                        instanceDate: dateStr
                    })
                }
                // Task was completed on this day (even if due on different day) - show on today only
                else if (task.completed && completedDate === dateStr && isToday) {
                    result.push({
                        task,
                        isCompleted: task.completed,
                        isRecurring: false,
                        instanceDate: dateStr
                    })
                }
                // No due date - show on today if not completed OR if completed today
                else if (!dueDate && isToday) {
                    if (!task.completed || completedDate === dateStr) {
                        result.push({
                            task,
                            isCompleted: task.completed,
                            isRecurring: false,
                            instanceDate: dateStr
                        })
                    }
                }
                // Overdue - show on today if not completed
                else if (!task.completed && dueDate && dueDate < dateStr && isToday) {
                    result.push({
                        task,
                        isCompleted: false,
                        isRecurring: false,
                        instanceDate: dateStr
                    })
                }
            }
        })

        return result
    }, [tasks, recurringCompletions, selectedDate, dateStr, isToday])

    // Group tasks by sort criteria with dynamic labels
    const groupedTasks = useMemo((): TaskGroup[] => {
        const priorityScore = { high: 3, medium: 2, low: 1 }

        // Sort all tasks by priority first (secondary sort)
        const sortedByPriority = [...dayTasks].sort((a, b) => {
            const pA = priorityScore[a.task.priority || 'medium']
            const pB = priorityScore[b.task.priority || 'medium']
            return pB - pA // High first
        })

        const groups: TaskGroup[] = []

        switch (sortBy) {
            case 'type': {
                const regular = sortedByPriority.filter(t => !t.isRecurring)
                const recurring = sortedByPriority.filter(t => t.isRecurring)

                if (sortOrder === 'asc') {
                    if (regular.length) groups.push({ key: 'tasks', label: 'Tasks', emoji: '📝', tasks: regular })
                    if (recurring.length) groups.push({ key: 'recurring', label: 'Recurring', emoji: '🔄', tasks: recurring })
                } else {
                    if (recurring.length) groups.push({ key: 'recurring', label: 'Recurring', emoji: '🔄', tasks: recurring })
                    if (regular.length) groups.push({ key: 'tasks', label: 'Tasks', emoji: '📝', tasks: regular })
                }
                break
            }

            case 'priority': {
                const high = sortedByPriority.filter(t => t.task.priority === 'high')
                const medium = sortedByPriority.filter(t => t.task.priority === 'medium' || !t.task.priority)
                const low = sortedByPriority.filter(t => t.task.priority === 'low')

                if (sortOrder === 'asc') {
                    // Default: High priority first (most important)
                    if (high.length) groups.push({ key: 'high', label: 'High Priority', emoji: '🔥', tasks: high })
                    if (medium.length) groups.push({ key: 'medium', label: 'Normal Priority', emoji: '📋', tasks: medium })
                    if (low.length) groups.push({ key: 'low', label: 'Low Priority', emoji: '💤', tasks: low })
                } else {
                    // Reversed: Low priority first
                    if (low.length) groups.push({ key: 'low', label: 'Low Priority', emoji: '💤', tasks: low })
                    if (medium.length) groups.push({ key: 'medium', label: 'Normal Priority', emoji: '📋', tasks: medium })
                    if (high.length) groups.push({ key: 'high', label: 'High Priority', emoji: '🔥', tasks: high })
                }
                break
            }

            case 'due': {
                // Group by due date relative to today
                const formatDueLabel = (dueStr: string | null | undefined): { key: string, label: string, emoji: string } => {
                    if (!dueStr) return { key: 'no-date', label: 'No Due Date', emoji: '📌' }

                    // Extract just the date portion (YYYY-MM-DD)
                    const datePart = dueStr.split('T')[0]

                    const todayDate = new Date()
                    todayDate.setHours(0, 0, 0, 0)

                    // Parse date safely
                    const [year, month, day] = datePart.split('-').map(Number)
                    if (!year || !month || !day) {
                        return { key: 'no-date', label: 'No Due Date', emoji: '📌' }
                    }

                    const dueDate = new Date(year, month - 1, day)
                    if (isNaN(dueDate.getTime())) {
                        return { key: 'no-date', label: 'No Due Date', emoji: '📌' }
                    }

                    const diffDays = Math.floor((dueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

                    if (diffDays < 0) {
                        return { key: 'overdue', label: `Overdue`, emoji: '⚠️' }
                    } else if (diffDays === 0) {
                        return { key: 'today', label: `Due Today`, emoji: '📅' }
                    } else if (diffDays === 1) {
                        return { key: 'tomorrow', label: `Due Tomorrow`, emoji: '📆' }
                    } else if (diffDays <= 7) {
                        const dayName = dueDate.toLocaleDateString(undefined, { weekday: 'long' })
                        return { key: `due-${datePart}`, label: `Due ${dayName}`, emoji: '🗓️' }
                    } else {
                        const formatted = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                        return { key: `due-${datePart}`, label: `Due ${formatted}`, emoji: '📋' }
                    }
                }

                // Sort by due date - for recurring tasks, use their instanceDate
                const sortedByDue = [...sortedByPriority].sort((a, b) => {
                    // For recurring tasks, use instanceDate; for regular tasks, use due_date
                    const dateA = a.isRecurring ? a.instanceDate : (a.task.due_date?.split('T')[0] || 'zzzz')
                    const dateB = b.isRecurring ? b.instanceDate : (b.task.due_date?.split('T')[0] || 'zzzz')
                    const cmp = dateA.localeCompare(dateB)
                    return sortOrder === 'asc' ? cmp : -cmp
                })

                // Group - for recurring tasks, use instanceDate for grouping
                const groupMap = new Map<string, TaskGroup>()
                sortedByDue.forEach(t => {
                    // For recurring tasks, use instanceDate; for regular tasks, use due_date
                    const dateToUse = t.isRecurring ? t.instanceDate : t.task.due_date
                    const { key, label, emoji } = formatDueLabel(dateToUse)
                    if (!groupMap.has(key)) {
                        groupMap.set(key, { key, label, emoji, tasks: [] })
                    }
                    groupMap.get(key)!.tasks.push(t)
                })

                groups.push(...groupMap.values())
                break
            }
        }

        return groups
    }, [dayTasks, sortBy, sortOrder])

    const completedCount = dayTasks.filter(t => t.isCompleted).length
    const totalCount = dayTasks.length

    if (dayTasks.length === 0) {
        return (
            <div className={`text-center py-12 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                <div className="text-4xl mb-4">{isPast ? '📜' : '✨'}</div>
                <p className="text-lg font-medium mb-1">
                    {isPast ? 'No tasks were scheduled' : 'No tasks scheduled'}
                </p>
                <p className="text-sm opacity-75">
                    {isToday ? 'Add a task to get started' : isPast ? 'for this day' : 'for this day yet'}
                </p>
            </div>
        )
    }

    const renderTaskItem = (item: DayTask) => {
        const { task, isCompleted, isRecurring, instanceDate } = item
        const isOverdue = !isRecurring && !isCompleted && task.due_date && task.due_date.split('T')[0] < today

        return (
            <div
                key={`${task.id}-${instanceDate}`}
                className={`${isDark
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-white border-gray-200 hover:shadow-md'} 
                    border rounded-xl p-4 transition-all duration-300 flex items-center gap-4`}
            >
                {/* Checkbox area - larger click zone */}
                <div
                    className="flex-shrink-0 p-2 -m-2 cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggle(task.id, instanceDate)
                    }}
                >
                    <input
                        type="checkbox"
                        checked={isCompleted}
                        onChange={() => { }}
                        className={`checkbox-custom pointer-events-none ${isDark ? 'checkbox-dark' : 'checkbox-light'}`}
                    />
                </div>

                {/* Task content - clickable to edit */}
                <div
                    className={`flex flex-col flex-1 min-w-0 cursor-pointer ${isCompleted ? 'opacity-60' : ''}`}
                    onClick={() => onEdit(task, instanceDate)}
                >
                    <span className={`block font-medium truncate ${isDark ? 'text-white/90' : 'text-gray-900'} ${isCompleted ? 'line-through' : ''}`}>
                        {task.title}
                    </span>
                    <div className="flex gap-2 mt-1 flex-wrap">
                        {sortBy !== 'type' && isRecurring && (
                            <span className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                                🔄 {task.recurrence}
                            </span>
                        )}
                        {sortBy !== 'due' && isOverdue && (
                            <span className="text-xs text-red-400">
                                ⚠️ Overdue
                            </span>
                        )}
                        {sortBy !== 'priority' && task.priority && task.priority !== 'medium' && (
                            <span className={`text-xs ${task.priority === 'high' ? 'text-orange-400' : 'text-blue-400'}`}>
                                {task.priority === 'high' ? '🔥' : '💤'} {task.priority}
                            </span>
                        )}
                        {(task.comment_count || 0) > 0 && (
                            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'} flex items-center gap-0.5`}>
                                💬 {task.comment_count}
                            </span>
                        )}
                    </div>
                </div>

                {!isPast && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            confirmDelete(task.title, () => onDelete(task.id))
                        }}
                        className="btn-delete flex-shrink-0"
                        style={!isDark ? { color: '#9ca3af' } : {}}
                    >
                        ✕
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Progress indicator and Hide Recurring toggle */}
            <div className="flex items-center justify-between mb-4">
                <div className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    {completedCount} of {totalCount} completed
                    {completedCount === totalCount && totalCount > 0 && ' 🎉'}
                </div>
                {onHideRecurringChange && (
                    <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        Hide recurring
                        <input
                            type="checkbox"
                            checked={hideRecurring}
                            onChange={(e) => onHideRecurringChange(e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                    </label>
                )}
            </div>

            {groupedTasks.map((group, idx) => (
                <div key={group.key} className={idx > 0 ? 'mt-6' : ''}>
                    <h3 className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-2 mb-3`}>
                        {group.emoji} {group.label}
                    </h3>
                    <div className="space-y-3">
                        {group.tasks.map(renderTaskItem)}
                    </div>
                </div>
            ))}
        </div>
    )
}
