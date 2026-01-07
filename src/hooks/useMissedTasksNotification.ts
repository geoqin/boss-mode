"use client"

import { useEffect, useRef } from 'react'
import { Task, RecurringTaskCompletion } from '@/app/types'
import { getMissedTasks } from '@/app/utils/taskUtils'
import { getLocalTodayDate, formatLocalDate } from '@/app/utils/dateUtils'
import { useNotifications } from './useNotifications'

const MISSED_TASKS_NOTIFICATION_KEY = 'boss-mode-missed-tasks-last-check'

/**
 * Hook to send a one-time notification for missed recurring tasks from yesterday.
 * Only sends once per day, tracked via localStorage.
 */
export function useMissedTasksNotification(
    tasks: Task[],
    recurringCompletions: RecurringTaskCompletion[],
    enabled: boolean
) {
    const { sendNotification, permission } = useNotifications()
    const hasCheckedRef = useRef(false)

    useEffect(() => {
        // Only run once per component mount
        if (hasCheckedRef.current) return
        if (!enabled || permission !== 'granted') return
        if (tasks.length === 0) return

        hasCheckedRef.current = true

        // Check if we've already notified today
        const today = getLocalTodayDate()
        const lastCheck = localStorage.getItem(MISSED_TASKS_NOTIFICATION_KEY)

        if (lastCheck === today) {
            // Already checked today, skip
            return
        }

        // Get missed tasks from yesterday
        const missedTasks = getMissedTasks(tasks, recurringCompletions, today)

        if (missedTasks.length > 0) {
            // Send notification
            const title = missedTasks.length === 1
                ? "Missed Task Yesterday 😅"
                : `${missedTasks.length} Missed Tasks Yesterday 😅`

            const body = missedTasks.length === 1
                ? `You missed: "${missedTasks[0].title}"`
                : `You missed: ${missedTasks.slice(0, 3).map(t => t.title).join(', ')}${missedTasks.length > 3 ? ` and ${missedTasks.length - 3} more` : ''}`

            sendNotification(title, body)
        }

        // Mark as checked for today
        localStorage.setItem(MISSED_TASKS_NOTIFICATION_KEY, today)
    }, [tasks, recurringCompletions, enabled, permission, sendNotification])
}
