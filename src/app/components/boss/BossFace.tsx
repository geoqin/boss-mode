"use client"

import { useState, useEffect } from "react"
import { Task } from "@/app/types"

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
        const today = new Date().toISOString().split('T')[0]
        const hasOverdue = tasks.some(t => !t.completed && t.due_date && t.due_date < today)

        if (totalCount === 0) {
            // Start / Default
            emoji = "😎"
            bgColor = "bg-yellow-400"
        } else if (incompleteCount === 0) {
            // All done - Happy/Warm Yellow
            emoji = "🤩" // Star-struck
            bgColor = "bg-yellow-300"
            shadowColor = "shadow-yellow-300/50"
        } else {
            // Check urgency/failure moods first (Overdue or Low Progress)
            if (hasOverdue || (totalCount > 0 && completionRate < 0.33)) {
                // Angry - Red
                emoji = "😡" // Pouting face
                bgColor = "bg-red-400"
                shadowColor = "shadow-red-400/50"
            } else if (currentHour !== null && currentHour >= 22) {
                // Late - Pastel Red Angry Sweats
                emoji = "🥵" // Hot face (sweating)
                bgColor = "bg-red-300"
                shadowColor = "shadow-red-300/50"
            } else if (currentHour !== null && currentHour >= 0 && currentHour < 5) {
                // Working super late - Respect/Cool
                emoji = "🫡" // Saluting face
                bgColor = "bg-blue-300"
                shadowColor = "shadow-blue-300/50"
            } else {
                // Progress-based moods (Positive)
                if (incompleteCount === 1 || completionRate > 0.8) {
                    // Almost there - Pumped Up/Encouragement
                    emoji = "😤" // Face with steam from nose
                    bgColor = "bg-orange-300"
                    shadowColor = "shadow-orange-300/50"
                } else if (completionRate < 0.5 && totalCount > 3) {
                    // Middleware - Stern Orange (fallback if not angry yet but slow)
                    emoji = "😒" // Unamused face
                    bgColor = "bg-orange-400"
                    shadowColor = "shadow-orange-400/50"
                } else {
                    // Middle / Working
                    emoji = "🧐" // Monocle / Focused
                    bgColor = "bg-yellow-400"
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
