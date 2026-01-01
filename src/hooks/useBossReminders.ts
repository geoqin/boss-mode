import { useEffect, useState, useRef } from 'react'
import { Task } from '@/app/types'
import { useNotifications } from './useNotifications'

export function useBossReminders(tasks: Task[], enabled: boolean = true) {
    const { sendNotification, permission } = useNotifications()
    const [notifiedTaskIds, setNotifiedTaskIds] = useState<Set<string>>(new Set())
    const lastCheckRef = useRef<number>(0)

    useEffect(() => {
        if (!enabled || permission !== 'granted') return

        const checkReminders = () => {
            const now = new Date()
            const nowTime = now.getTime()

            // Throttle checking to once every minute at most
            if (nowTime - lastCheckRef.current < 60000) return
            lastCheckRef.current = nowTime

            tasks.forEach(task => {
                if (task.completed || !task.due_date || notifiedTaskIds.has(task.id)) return

                const dueDate = new Date(task.due_date)
                const timeDiff = dueDate.getTime() - nowTime

                // If due within 15 minutes (and in the future)
                // 15 mins = 15 * 60 * 1000 = 900,000 ms
                if (timeDiff > 0 && timeDiff <= 900000) {
                    sendNotification(
                        "Boss Watch 👁️",
                        `Task '${task.title}' is due in less than 15 minutes. Get it done.`
                    )

                    // Mark as notified so we don't spam
                    setNotifiedTaskIds(prev => {
                        const newSet = new Set(prev)
                        newSet.add(task.id)
                        return newSet
                    })
                }
            })
        }

        // Check immediately
        checkReminders()

        // Then check every minute
        const intervalId = setInterval(checkReminders, 60000)

        return () => clearInterval(intervalId)
    }, [tasks, permission, sendNotification, notifiedTaskIds])

    return {}
}
