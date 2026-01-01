import { Task } from "@/app/types"

// Helper to calculate next due date for recurring tasks
export function getNextDueDate(task: Task): Date | null {
    if (!task.recurrence || !task.completed) return null

    const baseDate = task.due_date ? new Date(task.due_date) : new Date()
    const nextDate = new Date(baseDate)

    switch (task.recurrence) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + 1)
            break
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7)
            break
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1)
            break
    }

    return nextDate
}

// Check if a completed recurring task should revert to incomplete
export function shouldRevertToIncomplete(task: Task): boolean {
    if (!task.recurrence || !task.completed) return false

    const nextDue = getNextDueDate(task)
    if (!nextDue) return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    nextDue.setHours(0, 0, 0, 0)

    return nextDue <= today
}
