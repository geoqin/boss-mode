"use client"

import { Task } from "@/app/types"
import { useMemo } from "react"
import { getNextDueDate, shouldRevertToIncomplete } from "@/app/utils/taskUtils"
import { parseLocalYMD, normalizeDate } from "@/app/utils/dateUtils"
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

            // NOTE: We rely on the parent component (Dashboard) to filter out "History" (tasks completed before today).
            // Therefore, we should NOT strictly hide completed tasks here, as we want to show "Today's Completed Tasks".
            // Only skip if it's a non-recurring task that somehow slipped through and isn't for today/future? 
            // Actually, just trusting the input `tasks` list is safer.

            // Determine effective start date: due_date -> created_at -> now (fallback)
            // User rule: "if tasks have no date, assume they are due the same day they are due [sic - likely means created], but do not show the due date."
            // "if a task is set as recurring but there is no date set, assume the due date is the same as the date created"
            let baseDateStr = task.due_date
            if (!baseDateStr) {
                // specific hack: if created_at is standard ISO, parseLocalYMD handles it via split('T')
                baseDateStr = task.created_at
            }

            // If somehow even created_at is missing (unlikely), fallback to today? 
            // Types say created_at is string, so we are good.
            let startDate = parseLocalYMD(baseDateStr)

            // Special Case: Non-recurring, no due date. 
            // "assume they are due the same day... but do not show the due date"
            // If we treat them as due on creation date, they will likely be 'Overdue' or 'Today'.
            // The previous logic put them in 'Later' (MaxDate). We are changing this.

            if (!task.recurrence) {
                // Non-recurring
                expanded.push({
                    task,
                    displayDate: startDate,
                    isVirtual: false
                })
            } else {
                // Recurring
                // User rule: "Recurring tasks only need to be shown on the current day."
                // Actually, they should show on their due date (Today or Overdue).
                // If the due date is in the future, we skip it per user request.

                const taskDueDate = task.due_date ? parseLocalYMD(task.due_date) : startDate
                const normalizedDue = normalizeDate(taskDueDate)

                // Only show if it's today or overdue. 
                // Don't populate future instances.
                if (normalizedDue <= today) {
                    expanded.push({
                        task,
                        displayDate: normalizedDue,
                        isVirtual: false,
                        instanceDateStr: normalizedDue.toISOString().split('T')[0]
                    })
                }
            }
        })

        return expanded.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime())
    }, [tasks, mounted])

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
            later: expandedTasks.filter(t => t.displayDate > nextWeek),
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
                        // Hide date details if the original task has no due_date set
                        const hideDateText = !task.due_date

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
                                        // Toggling is always enabled now as we don't have future virtual instances
                                        disabled={false}
                                    />

                                    <div className="flex flex-col flex-1">
                                        <span className={`block font-medium ${isDark ? 'text-white/90' : 'text-gray-900'} ${item.isVirtual ? 'opacity-80' : ''}`}>
                                            {task.title}
                                        </span>
                                        <div className="flex gap-2 mt-1 flex-wrap">
                                            {!hideDateText && (
                                                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                    {item.displayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
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
            {renderGroup('Later', groups.later, 'bg-gray-400', 'No tasks scheduled for later')}
        </div>
    )
}
