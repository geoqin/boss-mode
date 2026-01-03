"use client"

import { Task } from "@/app/types"
import { useMemo } from "react"
import { getNextDueDate, shouldRevertToIncomplete } from "@/app/utils/taskUtils"
import { useMounted } from "@/hooks/useMounted"

interface TimelineViewProps {
    tasks: Task[]
    onToggle: (id: string, instanceDate?: string) => void
    onDelete: (id: string) => void
    onEdit?: (task: Task, instanceDate?: string) => void
    theme?: 'light' | 'dark'
}

export function TimelineView({ tasks, onToggle, onDelete, onEdit, theme = 'dark' }: TimelineViewProps) {
    const isDark = theme === 'dark'
    const mounted = useMounted()

    // Helper to normalize date to midnight for comparison
    const normalizeDate = (d: Date) => {
        const newD = new Date(d)
        newD.setHours(0, 0, 0, 0)
        return newD
    }

    // Generate instances for recurring tasks
    const expandedTasks = useMemo(() => {
        if (!mounted) return []

        const expanded: { task: Task; displayDate: Date; isVirtual: boolean; instanceDateStr?: string }[] = []
        const now = new Date()
        const today = normalizeDate(now)
        const next30Days = new Date(today)
        next30Days.setDate(today.getDate() + 30)

        tasks.forEach(task => {
            const needsRevert = shouldRevertToIncomplete(task)

            // Skip if completed AND not needing revert (i.e. actually done for now)
            if (task.completed && !needsRevert) return

            if (!task.recurrence || !task.due_date) {
                // Non-recurring or no date
                expanded.push({
                    task,
                    displayDate: task.due_date ? normalizeDate(new Date(task.due_date)) : new Date(8640000000000000), // Max date for 'later'
                    isVirtual: false
                })
            } else {
                // Recurring
                // If the task is effectively "reverted" (completed=true but next due is today/past), 
                // we should start generating instances from the NEXT due date, not the old completed date.
                let startDate = new Date(task.due_date)
                if (task.completed && needsRevert) {
                    const next = getNextDueDate(task)
                    if (next) startDate = next
                }

                const start = normalizeDate(startDate)
                const current = new Date(start)

                // Safety break for infinite loops
                let count = 0
                while (current <= next30Days && count < 100) {
                    count++

                    // Only add if it's within our window (today onwards) OR if it's the original overdue date
                    // Note: If we shifted start date due to revert, 'start' is the new due date (Today/Overdue)
                    if (current >= today || current.getTime() === start.getTime()) {
                        expanded.push({
                            task,
                            displayDate: new Date(current),
                            // It's virtual if it's NOT the calculated start date
                            isVirtual: current.getTime() !== start.getTime(),
                            instanceDateStr: current.toISOString().split('T')[0]
                        })
                    }

                    // Advance date
                    if (task.recurrence === 'daily') {
                        current.setDate(current.getDate() + 1)
                    } else if (task.recurrence === 'weekly') {
                        current.setDate(current.getDate() + 7)
                    } else if (task.recurrence === 'monthly') {
                        current.setMonth(current.getMonth() + 1)
                    }
                }
            }
        })

        return expanded.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime())
    }, [tasks])

    const groups = useMemo(() => {
        const now = new Date()
        const today = normalizeDate(now)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const nextWeek = new Date(today)
        nextWeek.setDate(nextWeek.getDate() + 7)

        return {
            overdue: expandedTasks.filter(t => t.displayDate < today),
            today: expandedTasks.filter(t => t.displayDate.getTime() === today.getTime()),
            tomorrow: expandedTasks.filter(t => t.displayDate.getTime() === tomorrow.getTime()),
            upcoming: expandedTasks.filter(t => t.displayDate > tomorrow && t.displayDate <= nextWeek),
            later: expandedTasks.filter(t => t.displayDate > nextWeek || t.displayDate.getFullYear() > 3000), // simplistic check for 'later'
        }
    }, [expandedTasks])

    const renderGroup = (title: string, items: typeof expandedTasks, colorClass: string, emptyMsg: string) => {
        if (items.length === 0) return null

        return (
            <div className="mb-8 animate-fade-in last:mb-0">
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 border-b pb-2 ${isDark ? 'text-white/40 border-white/10' : 'text-gray-500 border-gray-200'}`}>
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${colorClass}`}></span>
                    {title} ({items.length})
                </h3>
                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-0 before:w-px before:bg-white/5 before:-z-10 pl-8">
                    {items.map((item, idx) => {
                        const { task } = item
                        const instanceKey = `${task.id}-${item.displayDate.toISOString()}`

                        return (
                            <div key={instanceKey} className="relative">
                                {/* Timestamp Dot */}
                                <div className={`absolute -left-[27px] top-4 w-3 h-3 rounded-full border-2 ${isDark ? 'bg-[#0f0c29] border-white/20' : 'bg-white border-gray-300'} z-10`} />

                                <div
                                    className={`${isDark
                                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                        : 'bg-white border-gray-200 hover:shadow-md'} 
                                    border rounded-xl p-4 transition-all duration-300 flex items-center gap-4 cursor-pointer`}
                                    onClick={() => onEdit?.(task, item.instanceDateStr)}
                                >

                                    <input
                                        type="checkbox"
                                        checked={task.completed} // Virtual instances appear "completed" only if the main task is? actually recurring tasks uncheck themselves?
                                        // For timeline view, we assume virtual future instances are NOT completed.
                                        // The main 'overdue/today' one tracks the actual task status.
                                        onChange={(e) => {
                                            e.stopPropagation()
                                            onToggle(task.id, item.instanceDateStr)
                                        }}
                                        className="checkbox-custom"
                                        style={!isDark ? { borderColor: '#d1d5db' } : {}}
                                        // Disable checkbox for virtual future instances if we assume strict sequential? 
                                        // Or allow checking them off early? User requested "1 instance for each day... pre-populated"
                                        // Let's allow toggling. But toggling a future instance might be complex if it's virtual.
                                        // For now, let's treat toggle as acting on the main task if it's the "current" one, 
                                        // or ignore if it's future virtual (since DB row doesn't exist).
                                        // Actually, simplistic approach: Toggle only real task.
                                        disabled={item.isVirtual}
                                    />

                                    <div className="flex flex-col flex-1">
                                        <span className={`block font-medium ${isDark ? 'text-white/90' : 'text-gray-900'} ${item.isVirtual ? 'opacity-80' : ''}`}>
                                            {task.title}
                                        </span>
                                        <div className="flex gap-2 mt-1 flex-wrap">
                                            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                {item.displayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                            </span>
                                            {task.recurrence && (
                                                <span className={`text-xs ${isDark ? 'text-purple-300' : 'text-purple-600'}`}>
                                                    🔄 {task.recurrence}
                                                </span>
                                            )}
                                            {/* Show comment count? "small speech bubble... next to any tasks with a comment" */}
                                            {/* Note: comment_count on task is total. We can't really split it per instance easily without new DB query. 
                                            User asked for x comments "on THAT task". 
                                            For virtual instances, we probably don't have counts yet unless we fetched them specifically.
                                            Let's show the global count for now as fallback, or nothing if virtual.
                                        */}
                                            {!item.isVirtual && (task.comment_count || 0) > 0 && (
                                                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'} flex items-center gap-0.5`}>
                                                    💬 {task.comment_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDelete(task.id)
                                        }}
                                        className="btn-delete"
                                        style={!isDark ? { color: '#9ca3af' } : {}}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    const hasTasks = Object.values(groups).some(g => g.length > 0)

    if (!hasTasks) {
        return (
            <div className={`text-center py-16 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                <div className="text-5xl mb-4">🗓️</div>
                <p className="text-lg font-medium mb-1">Your schedule is clear</p>
                <p className="text-sm opacity-75">Add tasks with due dates to see them here</p>
            </div>
        )
    }

    return (
        <div className="py-2">
            {renderGroup("Overdue", groups.overdue, "bg-red-500", "No overdue tasks")}
            {renderGroup("Today", groups.today, "bg-green-500", "Nothing due today")}
            {renderGroup("Tomorrow", groups.tomorrow, "bg-yellow-500", "Nothing due tomorrow")}
            {renderGroup("Upcoming", groups.upcoming, "bg-blue-500", "Nothing upcoming")}
            {renderGroup("Later / No Date", groups.later, "bg-gray-500", "Empty backlog")}
        </div>
    )
}
