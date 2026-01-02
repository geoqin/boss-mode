"use client"

import { useState, useEffect } from "react"
import { Task } from "@/app/types"
import { getLocalTodayDate } from "@/app/utils/dateUtils"

interface BossFaceProps {
    tasks: Task[]
    className?: string
}

export function BossFace({ tasks, className = "" }: BossFaceProps) {
    const [currentHour, setCurrentHour] = useState<number | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentHour(new Date().getHours())
            setMounted(true)
        }, 0)
        return () => clearTimeout(timer)
    }, [])

    // Logic to determine mood
    const incompleteCount = tasks.filter(t => !t.completed).length
    const totalCount = tasks.length
    const completionRate = totalCount > 0 ? (totalCount - incompleteCount) / totalCount : 0

    let emoji = "😎" // Default: Smirking Face with Sunglasses
    let bgColor = "bg-yellow-400"
    let shadowColor = "shadow-yellow-400/50"

    // Only calculate mood if mounted (client-side) to avoid hydration mismatch
    if (mounted) {
        const today = getLocalTodayDate()

        // --- Boss Mood Logic Refactor ---
        // 1. Previous tasks (due < today) -> IGNORED for mood (as per user request)
        // 2. Today's tasks (due == today) -> Main driver for mood
        // 3. Future tasks (due > today) -> Used for "Chill" state check

        // Relevant tasks for mood = Tasks due Today (or no due date)
        // Relevant tasks for mood = Tasks due Today or Earlier (Overdue)
        const activeTasksForMood = tasks.filter(t => !t.due_date || (t.due_date.split('T')[0] <= today))

        const incompleteCount = activeTasksForMood.filter(t => !t.completed).length
        const totalCount = activeTasksForMood.length
        const completionRate = totalCount > 0 ? (totalCount - incompleteCount) / totalCount : 0

        // Future-only check: Are there any tasks at all for today?
        // Reuse the logic: If NO active tasks today, check if future tasks exist.
        const futureTasks = tasks.filter(t => {
            if (t.recurrence) return false // Recurring don't count as "future backlog"
            // Use split('T')[0] to ensure we only check dates properly strictly > today
            return t.due_date && t.due_date.split('T')[0] > today
        })

        const hasWorkToday = totalCount > 0
        const hasFutureWork = futureTasks.length > 0
        const allFutureWorkDone = futureTasks.every(t => t.completed)

        // Determine Mood
        if (!hasWorkToday) {
            // No work today!
            if (hasFutureWork && !allFutureWorkDone) {
                // Future tasks exist - Chill
                emoji = "😎"
                bgColor = "bg-green-300"
                shadowColor = "shadow-green-300/50"
            } else if (hasFutureWork && allFutureWorkDone) {
                // Future work exists and is ALL DONE - Star Struck
                emoji = "🤩"
                bgColor = "bg-yellow-300"
                shadowColor = "shadow-yellow-300/50"
            } else {
                // No work at all - Default Chill
                emoji = "😎"
                bgColor = "bg-yellow-400"
                shadowColor = "shadow-yellow-400/50"
            }
        } else if (incompleteCount === 0) {
            // Worked today and finished everything!
            emoji = "🤩"
            bgColor = "bg-yellow-300"
            shadowColor = "shadow-yellow-300/50"
        } else {
            // Work to do today!
            // Note: Overdue tasks are explicitly IGNORED for angry face here.

            if (currentHour !== null && currentHour >= 22) {
                // Late night - Hot face
                emoji = "🥵"
                bgColor = "bg-red-300"
                shadowColor = "shadow-red-300/50"
            } else if (currentHour !== null && currentHour >= 0 && currentHour < 5) {
                // Super late - Respect
                emoji = "🫡"
                bgColor = "bg-blue-300"
                shadowColor = "shadow-blue-300/50"
            } else {
                // Progress moods
                if (completionRate < 0.33) {
                    // Just starting / Low progress -> Angry
                    emoji = "😡"
                    bgColor = "bg-red-400"
                    shadowColor = "shadow-red-400/50"
                } else if (incompleteCount === 1 || completionRate > 0.8) {
                    // Almost there -> Pumped
                    emoji = "😤"
                    bgColor = "bg-orange-300"
                    shadowColor = "shadow-orange-300/50"
                } else if (completionRate < 0.5 && totalCount > 3) {
                    // Lagging behind -> Stern
                    emoji = "😒"
                    bgColor = "bg-orange-400"
                    shadowColor = "shadow-orange-400/50"
                } else {
                    // Working -> Focused
                    emoji = "🧐"
                    bgColor = "bg-yellow-400"
                    shadowColor = "shadow-yellow-400/50"
                }
            }
        }
    }

    // Update favicon
    useEffect(() => {
        if (!mounted) return

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <text y="50%" x="50%" dy=".35em" text-anchor="middle" font-size="90">${emoji}</text>
            </svg>
        `
        // Use Data URI instead of ObjectURL for better reliability
        const encodedSvg = encodeURIComponent(svg.trim().replace(/\s+/g, " "))
        const dataUri = `data:image/svg+xml;charset=utf-8,${encodedSvg}`

        // Update all related link tags
        const links = document.querySelectorAll("link[rel*='icon']")
        if (links.length > 0) {
            links.forEach(link => {
                const l = link as HTMLLinkElement
                l.href = dataUri
                l.type = 'image/svg+xml'
            })
        } else {
            const link = document.createElement('link')
            link.type = 'image/svg+xml'
            link.rel = 'icon'
            link.href = dataUri
            document.head.appendChild(link)
        }
    }, [emoji, bgColor, mounted])

    return (
        <div className={`relative group ${className}`}>
            <div className={`absolute inset-0 rounded-2xl blur opacity-40 transition-colors duration-500 ${bgColor}`}></div>
            <div className={`relative w-full h-full rounded-2xl flex items-center justify-center text-7xl shadow-lg transition-all duration-500 transform group-hover:scale-105 ${bgColor} ${shadowColor}`}>
                <span className="filter drop-shadow-sm select-none">{emoji}</span>
            </div>
        </div>
    )
}
