"use client"

import Link from "next/link"
import { User } from "@supabase/supabase-js"
import { Task } from "@/app/types"
import { BossFace } from "../boss/BossFace"
import { useState, useEffect } from "react"
import { getLocalTodayDate } from "@/app/utils/dateUtils"

interface DashboardHeaderProps {
    user: User | null
    displayName: string
    isDark: boolean
    notificationsEnabled: boolean
    onThemeToggle: () => void
    onNotificationToggle: () => void
    onSignOut: () => void
    tasks: Task[]
}

export function DashboardHeader({
    user,
    displayName,
    isDark,
    notificationsEnabled,
    onThemeToggle,
    onNotificationToggle,
    onSignOut,
    tasks
}: DashboardHeaderProps) {
    const [currentHour, setCurrentHour] = useState<number | null>(null)

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentHour(new Date().getHours())
        }, 0)
        return () => clearTimeout(timer)
    }, [])

    const textMuted = isDark ? "text-white/40" : "text-gray-500"
    const textHover = isDark ? "hover:text-white/60" : "hover:text-gray-700"

    // Filter tasks for message: Only count tasks due Today or Earlier (or no due date)
    const today = getLocalTodayDate()
    const relevantTasks = tasks.filter(t => !t.due_date || t.due_date.split('T')[0] <= today)

    const completedCount = relevantTasks.filter(t => t.completed).length
    const totalCount = relevantTasks.length
    const incompleteCount = totalCount - completedCount

    // Boss Message Logic
    let message = "Good work."
    if (totalCount === 0) {
        message = "No tasks? Add some work."
    } else if (incompleteCount === 0) {
        message = "Clean slate. Outstanding."
    } else if (incompleteCount === 1) {
        message = "Just one left. Finish it."
    } else if (incompleteCount <= 3) {
        message = "Stay focused."
    } else {
        message = "Stop procrastinating."
    }

    if (currentHour !== null) {
        if (incompleteCount > 0 && currentHour >= 22) {
            message = "It's late. Why isn't this done?"
        } else if (incompleteCount > 0 && currentHour >= 0 && currentHour < 5) {
            message = "Grinding late? Respect."
        }
    }

    return (
        <header className="mb-2 animate-fade-in relative z-20">
            <div className="flex items-center justify-between mb-2">
                {/* Logo / Home Button */}
                <Link href="/" className="hover:opacity-80 transition-opacity">
                    <h1 className="text-xl font-bold gradient-text">Boss Mode</h1>
                </Link>

                <div className="flex items-center gap-2">
                    {/* Theme Toggle */}
                    <button
                        onClick={onThemeToggle}
                        className={`${textMuted} ${textHover} text-xs transition-colors font-medium whitespace-nowrap`}
                    >
                        <span className="sm:hidden">{isDark ? 'Light' : 'Dark'}</span>
                        <span className="hidden sm:inline">{isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}</span>
                    </button>

                    <div className={`h-3 w-px ${isDark ? 'bg-white/10' : 'bg-gray-300'}`}></div>

                    {/* Account Dropdown */}
                    <div className="relative group cursor-pointer py-1">
                        <div className="flex items-center gap-1.5">
                            <span className={`${textMuted} text-xs group-hover:text-purple-400 transition-colors`}>
                                {displayName}
                            </span>
                            <span className={`${textMuted} text-[10px]`}>▼</span>
                        </div>

                        {/* Dropdown Content */}
                        <div className={`absolute right-0 top-full mt-1 w-56 rounded-xl shadow-2xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right z-50 ${isDark ? 'bg-[#0f0c29] border border-white/10' : 'bg-white border border-gray-100'}`}>
                            <div className="p-4 border-b border-gray-100 dark:border-white/5">
                                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Signed in as</p>
                                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.email}</p>
                            </div>

                            <div className="p-2">
                                {/* Notification Toggle */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNotificationToggle()
                                    }}
                                    className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-white/80' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <span className="text-lg">{notificationsEnabled ? '🔔' : '🔕'}</span>
                                    <span>
                                        {notificationsEnabled ? 'Notifications On' : 'Enable Notifications'}
                                    </span>
                                </button>
                            </div>

                            <div className="p-2 border-t border-gray-100 dark:border-white/5">
                                <Link
                                    href="/account"
                                    className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors ${isDark ? 'hover:bg-white/5 text-white/80' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <span className="text-lg">⚙️</span>
                                    Account Settings
                                </Link>
                                <button
                                    onClick={onSignOut}
                                    className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-lg transition-colors text-red-500 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}
                                >
                                    <span className="text-lg">🚪</span>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="flex items-start gap-4 pl-1">
                <div className="w-24 h-24 shrink-0">
                    <BossFace tasks={tasks} className="w-full h-full" />
                </div>

                {/* Speech Bubble */}
                <div className={`relative px-4 py-3 rounded-2xl rounded-tl-none text-sm font-medium leading-relaxed max-w-[80%] ${isDark
                    ? 'bg-[#1f2937] text-white/90 shadow-lg border border-white/5' // Solid dark gray bg
                    : 'bg-white text-gray-700 shadow-sm border border-gray-200'
                    }`}>
                    {message}

                    {/* SVG Tail */}
                    <svg
                        className="absolute -left-2 top-0 w-4 h-4 pointer-events-none transform -rotate-12"
                        viewBox="0 0 10 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M10 0V20L0 0H10Z"
                            fill={isDark ? "#1f2937" : "white"}
                        />
                    </svg>
                </div>
            </div>
        </header>
    )

}
