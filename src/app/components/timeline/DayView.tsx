"use client"

import { Task, RecurringTaskCompletion } from "@/app/types"
import { useMemo, Fragment, useState, useCallback } from "react"
import { useDeleteConfirm } from "@/app/components/DeleteConfirmProvider"
import { isInstanceCompleted, getRecurringInstances } from "@/app/utils/taskUtils"
import { formatLocalDate, getEffectiveDate } from "@/app/utils/dateUtils"
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverEvent
} from '@dnd-kit/core'
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove
} from '@dnd-kit/sortable'
import { SortableTask } from './SortableTask'

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
    onReorderTasks?: (taskIds: string[], groupKey: string) => void
    onMoveTaskToParent?: (childTaskId: string, parentTaskId: string) => Promise<boolean>
    isDark: boolean
    dayStartHour?: number
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
    onReorderTasks,
    onMoveTaskToParent,
    isDark,
    dayStartHour = 6
}: DayViewProps) {
    const { confirmDelete } = useDeleteConfirm()
    const dateStr = formatLocalDate(selectedDate)
    const today = getEffectiveDate(dayStartHour)
    const isToday = dateStr === today
    const isPast = dateStr < today

    // Rearrange mode state
    const [isRearrangeMode, setIsRearrangeMode] = useState(false)
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
    const [selectedTaskGroup, setSelectedTaskGroup] = useState<string | null>(null)

    // DnD sensors for pointer (mouse) and touch
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 8 }
    })
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 200, tolerance: 5 }
    })
    const sensors = useSensors(pointerSensor, touchSensor)

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

        // Base sort by priority
        const sortedByPriority = [...dayTasks].sort((a, b) => {
            const pA = priorityScore[a.task.priority || 'medium']
            const pB = priorityScore[b.task.priority || 'medium']
            return pB - pA // High first
        })

        const groups: TaskGroup[] = []

        switch (sortBy) {
            case 'type': {
                // For default 'type' view, use sort_order for manual reordering within each type
                const sortByOrder = (items: DayTask[]) =>
                    [...items].sort((a, b) => (a.task.sort_order ?? 0) - (b.task.sort_order ?? 0))

                const recurring = sortByOrder(sortedByPriority.filter(t => t.isRecurring))
                const regular = sortByOrder(sortedByPriority.filter(t => !t.isRecurring))

                if (sortOrder === 'asc') {
                    if (regular.length) groups.push({ key: 'tasks', label: 'Tasks', emoji: '📝', tasks: regular })
                    if (recurring.length) groups.push({ key: 'recurring', label: 'Recurring', emoji: '📅', tasks: recurring })
                } else {
                    if (recurring.length) groups.push({ key: 'recurring', label: 'Recurring', emoji: '📅', tasks: recurring })
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

    // Handle drag end - reorder within group
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        // Find which group these tasks belong to
        const activeId = active.id as string
        const overId = over.id as string

        // Find the group containing both tasks
        const group = groupedTasks.find(g =>
            g.tasks.some(t => t.task.id === activeId) &&
            g.tasks.some(t => t.task.id === overId)
        )

        if (group && onReorderTasks) {
            const oldIndex = group.tasks.findIndex(t => t.task.id === activeId)
            const newIndex = group.tasks.findIndex(t => t.task.id === overId)
            const newOrder = arrayMove(group.tasks.map(t => t.task.id), oldIndex, newIndex)
            onReorderTasks(newOrder, group.key)
        }
    }, [onReorderTasks, groupedTasks])

    // Handle click-to-swap or cross-group click-to-subtask
    const handleTaskClick = useCallback((taskId: string, groupKey: string) => {
        if (!isRearrangeMode) return

        if (!selectedTaskId) {
            // First selection - remember task and its group
            setSelectedTaskId(taskId)
            setSelectedTaskGroup(groupKey)
        } else if (selectedTaskId === taskId) {
            // Same task - deselect
            setSelectedTaskId(null)
            setSelectedTaskGroup(null)
        } else {
            // Second selection
            const sameGroup = selectedTaskGroup === groupKey

            if (sameGroup) {
                // Same group - swap positions
                const group = groupedTasks.find(g => g.key === groupKey)
                if (group && group.tasks.some(t => t.task.id === selectedTaskId) && onReorderTasks) {
                    const taskIds = group.tasks.map(t => t.task.id)
                    const idx1 = taskIds.indexOf(selectedTaskId)
                    const idx2 = taskIds.indexOf(taskId)
                    if (idx1 !== -1 && idx2 !== -1) {
                        const newOrder = [...taskIds]
                        newOrder[idx1] = taskId
                        newOrder[idx2] = selectedTaskId
                        onReorderTasks(newOrder, groupKey)
                    }
                }
            } else if (onMoveTaskToParent) {
                // Cross-group click - check if valid direction for making subtask
                // Valid: tasks → recurring
                const groupPriority: Record<string, number> = { 'tasks': 0, 'recurring': 1 }
                const selectedPriority = groupPriority[selectedTaskGroup || '']
                const targetPriority = groupPriority[groupKey]

                if (selectedPriority !== undefined && targetPriority !== undefined && selectedPriority < targetPriority) {
                    // Valid direction - make the first selected task a child of the second clicked task
                    onMoveTaskToParent(selectedTaskId, taskId)
                }
            }

            setSelectedTaskId(null)
            setSelectedTaskGroup(null)
        }
    }, [isRearrangeMode, selectedTaskId, selectedTaskGroup, onReorderTasks, onMoveTaskToParent, groupedTasks])

    // Handle drag over another task (make subtask)
    const handleDragOver = useCallback((event: DragOverEvent) => {
        // For now, we handle this in onDragEnd for drop-onto-task
        // This would need more complex implementation for visual feedback
    }, [])

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
                    onClick={() => !isRearrangeMode && onEdit(task, instanceDate)}
                >
                    <span className={`block font-medium truncate ${isDark ? 'text-white/90' : 'text-gray-900'} ${isCompleted ? 'line-through' : ''}`}>
                        {task.title}
                    </span>
                    <div className="flex gap-2 mt-1 flex-wrap">
                        {sortBy !== 'type' && isRecurring && (
                            <span className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                                📅 {task.recurrence === 'custom' && task.recurrence_interval_days
                                    ? `${task.recurrence_interval_days}d`
                                    : task.recurrence}
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
            {/* Hide Recurring toggle (left) and Rearrange toggle (right) */}
            <div className="flex items-center justify-between mb-4">
                {onHideRecurringChange && (
                    <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                        <input
                            type="checkbox"
                            checked={hideRecurring}
                            onChange={(e) => onHideRecurringChange(e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                        Hide recurring
                    </label>
                )}
                {onReorderTasks && (
                    <button
                        onClick={() => {
                            setIsRearrangeMode(!isRearrangeMode)
                            setSelectedTaskId(null)
                            setSelectedTaskGroup(null)
                        }}
                        className={`text-sm px-3 py-1 rounded-full transition-all ${isRearrangeMode
                            ? 'bg-orange-500 text-white'
                            : isDark
                                ? 'bg-white/10 text-white/60 hover:bg-white/20'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                    >
                        {isRearrangeMode ? '✓ Done' : '↕ Rearrange'}
                    </button>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
            >
                {groupedTasks.map((group, idx) => (
                    <div key={group.key} className={idx > 0 ? 'mt-6' : ''}>
                        <h3 className={`text-xs uppercase tracking-wider font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'} flex items-center gap-2 mb-3`}>
                            {group.emoji} {group.label}
                        </h3>
                        <SortableContext
                            items={group.tasks.map(t => t.task.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3">
                                {group.tasks.map(item => (
                                    <SortableTask
                                        key={`${item.task.id}-${item.instanceDate}`}
                                        id={item.task.id}
                                        isSelected={selectedTaskId === item.task.id}
                                        isRearrangeMode={isRearrangeMode}
                                    >
                                        <div onClick={() => handleTaskClick(item.task.id, group.key)}>
                                            {renderTaskItem(item)}
                                        </div>
                                    </SortableTask>
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                ))}
            </DndContext>
        </div>
    )
}
