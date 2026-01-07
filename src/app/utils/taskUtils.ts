import { Task, RecurringTaskCompletion } from "@/app/types"
import { parseLocalYMD, formatLocalDate, getLocalTodayDate } from "./dateUtils"

// ============================================================================
// RECURRING TASK INSTANCE UTILITIES (Habit-Tracker Model)
// ============================================================================

/**
 * Check if a recurring task instance is completed for a specific date
 */
export function isInstanceCompleted(
    taskId: string,
    instanceDate: string,
    completions: RecurringTaskCompletion[]
): boolean {
    return completions.some(
        c => c.task_id === taskId && c.instance_date === instanceDate
    )
}

/**
 * Get all instance dates for a recurring task between start and end dates
 * Returns array of YYYY-MM-DD strings
 */
export function getRecurringInstances(
    task: Task,
    startDate: Date,
    endDate: Date
): string[] {
    if (!task.recurrence) return []

    const instances: string[] = []
    const taskStartDate = task.due_date
        ? parseLocalYMD(task.due_date)
        : parseLocalYMD(task.created_at)

    // Normalize dates
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(0, 0, 0, 0)
    const taskStart = new Date(taskStartDate)
    taskStart.setHours(0, 0, 0, 0)

    // Generate instances based on recurrence pattern
    const currentDate = new Date(taskStart)

    // If task start is before our range, advance to first instance in range
    while (currentDate < start) {
        advanceDate(currentDate, task.recurrence)
    }

    // Generate instances within the range
    while (currentDate <= end) {
        instances.push(formatLocalDate(currentDate))
        advanceDate(currentDate, task.recurrence)
    }

    return instances
}

/**
 * Get the specific instance date for a recurring task for today
 */
export function getTodayInstanceDate(task: Task): string | null {
    if (!task.recurrence) return null
    return getLocalTodayDate()
}

/**
 * Check which recurring tasks were missed yesterday (for notification)
 */
export function getMissedTasks(
    tasks: Task[],
    completions: RecurringTaskCompletion[],
    today: string
): Task[] {
    const yesterday = new Date(parseLocalYMD(today))
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = formatLocalDate(yesterday)

    return tasks.filter(task => {
        if (!task.recurrence) return false

        // Check if this task had an instance due yesterday
        const taskStartDate = task.due_date
            ? parseLocalYMD(task.due_date)
            : parseLocalYMD(task.created_at)

        // Task must have started on or before yesterday
        if (taskStartDate > yesterday) return false

        // Check if the task was due yesterday based on its recurrence
        const instances = getRecurringInstances(task, yesterday, yesterday)
        if (!instances.includes(yesterdayStr)) return false

        // Check if it was completed
        return !isInstanceCompleted(task.id, yesterdayStr, completions)
    })
}

// ============================================================================
// ONE-OFF TASK UTILITIES
// ============================================================================

/**
 * Check if a one-off task is overdue
 */
export function isTaskOverdue(task: Task, today: string): boolean {
    if (task.recurrence) return false // Recurring tasks are never "overdue"
    if (task.completed) return false
    if (!task.due_date) return false

    return task.due_date.split('T')[0] < today
}

/**
 * Get tasks due on a specific date
 * For recurring tasks: checks if date falls on a recurrence instance
 * For one-off tasks: checks due_date
 */
export function getTasksForDate(
    tasks: Task[],
    date: string,
    completions: RecurringTaskCompletion[]
): { task: Task; isCompleted: boolean; isRecurring: boolean }[] {
    const result: { task: Task; isCompleted: boolean; isRecurring: boolean }[] = []
    const targetDate = parseLocalYMD(date)

    tasks.forEach(task => {
        if (task.recurrence) {
            // Check if this recurring task has an instance on this date
            const instances = getRecurringInstances(task, targetDate, targetDate)
            if (instances.includes(date)) {
                result.push({
                    task,
                    isCompleted: isInstanceCompleted(task.id, date, completions),
                    isRecurring: true
                })
            }
        } else {
            // One-off task: check if due on this date
            const dueDate = task.due_date?.split('T')[0]
            if (dueDate === date) {
                result.push({
                    task,
                    isCompleted: task.completed,
                    isRecurring: false
                })
            } else if (!task.completed && dueDate && dueDate < date) {
                // Overdue one-off tasks roll forward
                result.push({
                    task,
                    isCompleted: false,
                    isRecurring: false
                })
            }
        }
    })

    return result
}

// ============================================================================
// DATE ADVANCEMENT HELPER
// ============================================================================

function advanceDate(date: Date, recurrence: 'daily' | 'weekly' | 'monthly'): void {
    switch (recurrence) {
        case 'daily':
            date.setDate(date.getDate() + 1)
            break
        case 'weekly':
            date.setDate(date.getDate() + 7)
            break
        case 'monthly':
            date.setMonth(date.getMonth() + 1)
            break
    }
}

// ============================================================================
// SORTING UTILITIES
// ============================================================================

const priorityScore = { high: 3, medium: 2, low: 1 }

export function sortTasks(
    tasks: { task: Task; isCompleted: boolean; isRecurring: boolean }[],
    sortBy: 'type' | 'priority' | 'due',
    order: 'asc' | 'desc'
): typeof tasks {
    const sorted = [...tasks].sort((a, b) => {
        let comparison = 0

        switch (sortBy) {
            case 'type':
                // Recurring first (or last if desc)
                comparison = (a.isRecurring ? 1 : 0) - (b.isRecurring ? 1 : 0)
                break
            case 'priority':
                const pA = priorityScore[a.task.priority || 'medium']
                const pB = priorityScore[b.task.priority || 'medium']
                comparison = pB - pA // High priority first by default
                break
            case 'due':
                const dateA = a.task.due_date || ''
                const dateB = b.task.due_date || ''
                comparison = dateA.localeCompare(dateB) // Earliest first by default
                break
        }

        return order === 'desc' ? -comparison : comparison
    })

    return sorted
}

// ============================================================================
// LEGACY COMPATIBILITY (can be removed after migration)
// ============================================================================

/**
 * @deprecated Use getRecurringInstances and isInstanceCompleted instead
 */
export function getNextDueDate(task: Task): Date | null {
    if (!task.recurrence || !task.completed) return null

    const baseDate = task.due_date ? parseLocalYMD(task.due_date) : new Date()
    const nextDate = new Date(baseDate)
    advanceDate(nextDate, task.recurrence)

    return nextDate
}

/**
 * @deprecated Use getMissedTasks instead
 */
export function getPreviousDueDate(task: Task): Date | null {
    if (!task.recurrence) return null

    const baseDate = task.due_date ? parseLocalYMD(task.due_date) : new Date()
    const prevDate = new Date(baseDate)

    switch (task.recurrence) {
        case 'daily':
            prevDate.setDate(prevDate.getDate() - 1)
            break
        case 'weekly':
            prevDate.setDate(prevDate.getDate() - 7)
            break
        case 'monthly':
            prevDate.setMonth(prevDate.getMonth() - 1)
            break
    }

    return prevDate
}

/**
 * @deprecated No longer needed with habit-tracker model
 */
export function shouldRevertToIncomplete(task: Task): boolean {
    return false // Recurring tasks no longer "revert"
}
