import { useEffect, useState, useRef, useCallback } from 'react'
import { Task } from '@/app/types'
import { useNotifications } from './useNotifications'

export interface Alert {
    task: Task
    type: 'due' | 'reminder'
}

export function useBossReminders(tasks: Task[], enabled: boolean = true) {
    const { sendNotification, permission } = useNotifications()

    // Track alerts
    const [activeAlerts, setActiveAlerts] = useState<Alert[]>([])

    // Internal state tracking
    const [acknowledgedKeys, setAcknowledgedKeys] = useState<Set<string>>(new Set())
    const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({})

    const lastCheckRef = useRef<number>(0)

    // Helper to generate a unique key for a task instance
    const getTaskKey = (task: Task) => `${task.id}_${task.due_date}`

    const checkReminders = useCallback(() => {
        if (!enabled) return

        const now = new Date()
        const nowTime = now.getTime()

        // Throttle checking to once every minute
        if (nowTime - lastCheckRef.current < 60000) return
        lastCheckRef.current = nowTime

        tasks.forEach(task => {
            // Skip if completed or no due date
            if (task.completed || !task.due_date) return

            const taskKey = getTaskKey(task)

            // Skip if already acknowledged
            if (acknowledgedKeys.has(taskKey)) return

            // Skip if snoozed
            if (snoozedUntil[task.id] && snoozedUntil[task.id] > nowTime) return

            const dueDate = new Date(task.due_date)
            const dueTime = dueDate.getTime()
            const timeDiff = dueTime - nowTime

            // Check for immediate due date (within last 1 minute or future)
            const isDueNow = timeDiff <= 0 && timeDiff > -60000 // Just became due (or slightly past)
            // Or if we missed it significantly but haven't acked it? 
            // Let's implement a grace period for missed tasks (e.g., up to 24 hours past due)
            // But only trigger once.
            const isOverdueAndUnacked = timeDiff <= 0 && timeDiff > -86400000 // 24 hours

            // Check for reminder time
            let isReminderTime = false
            if (task.reminder_minutes_before) {
                const reminderTime = dueTime - (task.reminder_minutes_before * 60000)
                const reminderDiff = reminderTime - nowTime
                // Trigger if we are at or past reminder time (within last minute)
                if (reminderDiff <= 0 && reminderDiff > -60000) {
                    isReminderTime = true
                }
            }

            // Determine if we should alert
            // We alert if it IS due/overdue OR if it matches reminder time
            // To avoid double alerting, prioritize DUE alert over REMINDER alert if they overlap

            let alertType: 'due' | 'reminder' | null = null

            if (isOverdueAndUnacked) {
                // If it's just became due, or we haven't seen it yet
                // For simplicity: simple overdue check handles both "just due" and "missed"
                alertType = 'due'
            } else if (isReminderTime) {
                alertType = 'reminder'
            }

            if (alertType) {
                // Add to active alerts if not already present
                setActiveAlerts(prev => {
                    if (prev.some(a => a.task.id === task.id && a.type === alertType)) return prev // Already showing this alert
                    return [...prev, { task, type: alertType! }]
                })

                // Send Push Notification if not previously sent for this key
                // Use a separate tracking for PUSH sent vs UI shown? 
                // For now, let's just send push every time a new alert allows it
                // Logic: visual alert handles the persistent state. Push is ephemeral.
                if (permission === 'granted') {
                    const title = alertType === 'due' ? "Task Due! 🚨" : "Upcoming Task ⏰"
                    const body = alertType === 'due'
                        ? `Task '${task.title}' is due now.`
                        : `Task '${task.title}' is due in ${task.reminder_minutes_before} minutes.`

                    sendNotification(title, body)
                }
            }
        })
    }, [tasks, enabled, snoozedUntil, acknowledgedKeys, permission, sendNotification])

    useEffect(() => {
        checkReminders()
        const intervalId = setInterval(checkReminders, 10000) // Check every 10s (responsive)
        return () => clearInterval(intervalId)
    }, [checkReminders])

    const acknowledge = (taskId: string) => {
        // Find task to get key
        const task = tasks.find(t => t.id === taskId)
        if (task) {
            const key = getTaskKey(task)
            setAcknowledgedKeys(prev => {
                const newSet = new Set(prev)
                newSet.add(key)
                return newSet
            })
        }

        // Remove from active alerts
        setActiveAlerts(prev => prev.filter(a => a.task.id !== taskId))
    }

    const snooze = (taskId: string, minutes: number) => {
        const until = Date.now() + (minutes * 60000)
        setSnoozedUntil(prev => ({ ...prev, [taskId]: until }))

        // Remove from active alerts
        setActiveAlerts(prev => prev.filter(a => a.task.id !== taskId))
    }

    return {
        activeAlerts,
        acknowledge,
        snooze
    }
}
