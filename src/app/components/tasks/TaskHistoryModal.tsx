"use client"

import { Task } from "@/app/types"
import { useEffect, useState, useMemo } from "react"

interface TaskHistoryModalProps {
    historyTasks: Task[]
    isDark: boolean
    onClose: () => void
    onDelete: (id: string) => Promise<void>
    onRestore: (id: string) => Promise<void>
}

export function TaskHistoryModal({
    historyTasks,
    isDark,
    onClose,
    onDelete,
    onRestore
}: TaskHistoryModalProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedYear, setSelectedYear] = useState('all')
    const [selectedMonth, setSelectedMonth] = useState('all')
    const [selectedDay, setSelectedDay] = useState('all')

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose])

    // styles
    const inputClass = isDark
        ? "bg-white/5 text-white border-white/10 focus:border-white/30"
        : "bg-gray-50 text-gray-900 border-gray-200 focus:border-gray-300"
    const textMuted = isDark ? "text-white/40" : "text-gray-500"

    // Process tasks for filters and grouping
    const { filteredGroups, availableYears, availableMonths, availableDays } = useMemo(() => {
        // Collect available filter options from data
        const years = new Set<string>()
        const months = new Set<string>()
        const days = new Set<string>()

        const filtered = historyTasks.filter(task => {
            const date = task.completed_at ? new Date(task.completed_at) : null
            if (!date) return false

            const year = date.getFullYear().toString()
            const month = (date.getMonth() + 1).toString()
            const day = date.getDate().toString()

            years.add(year)
            months.add(month)
            days.add(day)

            // Search Filter
            if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false
            }

            // Date Filters
            if (selectedYear !== 'all' && year !== selectedYear) return false
            if (selectedMonth !== 'all' && month !== selectedMonth) return false
            if (selectedDay !== 'all' && day !== selectedDay) return false

            return true
        })

        // Sort tasks descending by completion time (newest first)
        filtered.sort((a, b) => {
            return (b.completed_at || '').localeCompare(a.completed_at || '')
        })

        // Group by Date
        const groups: Record<string, Task[]> = {}
        filtered.forEach(task => {
            const dateKey = task.completed_at ? task.completed_at.split('T')[0] : 'Unknown'
            if (!groups[dateKey]) groups[dateKey] = []
            groups[dateKey].push(task)
        })

        // Sort groups descending (Newest date first)
        // Convert to array of [date, tasks]
        const sortedGroups = Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))

        return {
            filteredGroups: sortedGroups,
            availableYears: Array.from(years).sort().reverse(),
            availableMonths: Array.from(months).sort((a, b) => parseInt(a) - parseInt(b)),
            availableDays: Array.from(days).sort((a, b) => parseInt(a) - parseInt(b))
        }
    }, [historyTasks, searchTerm, selectedYear, selectedMonth, selectedDay])


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl animate-fade-in flex flex-col ${isDark ? 'bg-[#1a1035] border border-white/10' : 'bg-white border border-gray-200'
                }`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Task History
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-purple-500 ${inputClass}`}
                        />
                        <div className="flex gap-2">
                            <select
                                value={selectedYear}
                                onChange={(e) => {
                                    setSelectedYear(e.target.value)
                                    // Reset granular filters on year change
                                    setSelectedMonth('all')
                                    setSelectedDay('all')
                                }}
                                className={`px-2 py-1.5 rounded-lg text-sm border focus:outline-none ${inputClass}`}
                            >
                                <option value="all">Year</option>
                                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select
                                value={selectedMonth}
                                onChange={(e) => {
                                    setSelectedMonth(e.target.value)
                                    setSelectedDay('all')
                                }}
                                className={`px-2 py-1.5 rounded-lg text-sm border focus:outline-none ${inputClass}`}
                            >
                                <option value="all">Month</option>
                                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <select
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(e.target.value)}
                                className={`px-2 py-1.5 rounded-lg text-sm border focus:outline-none ${inputClass}`}
                            >
                                <option value="all">Day</option>
                                {availableDays.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto flex-1 scrollbar-thin">
                    {filteredGroups.length === 0 ? (
                        <div className={`text-center py-12 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                            <div className="text-4xl mb-4">🔍</div>
                            <p className="text-lg font-medium mb-1">No tasks found</p>
                            <p className="text-sm opacity-75">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {filteredGroups.map(([date, tasks]) => (
                                <div key={date}>
                                    <h3 className={`text-sm font-medium mb-3 sticky top-0 py-2 backdrop-blur-md z-10 ${isDark ? 'text-purple-300 bg-[#1a1035]/90' : 'text-purple-700 bg-white/90'}`}>
                                        {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        <span className={`ml-2 text-xs font-normal ${textMuted}`}>({tasks.length})</span>
                                    </h3>
                                    <ul className="space-y-2">
                                        {tasks.map(task => (
                                            <li
                                                key={task.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${isDark ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-medium truncate ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                                        {task.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                            {task.completed_at ? new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                                                        </span>
                                                        {task.category_id && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>
                                                                Category
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                                                    <button
                                                        onClick={() => onRestore(task.id)}
                                                        title="Restore task"
                                                        className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/30 hover:text-green-400 hover:bg-white/5' : 'text-gray-400 hover:text-green-600 hover:bg-gray-100'}`}
                                                    >
                                                        ↩️
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(task.id)}
                                                        title="Delete permanently"
                                                        className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/30 hover:text-red-400 hover:bg-white/5' : 'text-gray-400 hover:text-red-600 hover:bg-gray-100'}`}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-between items-center ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className={`text-xs ${textMuted}`}>
                        Showing {filteredGroups.reduce((acc, curr) => acc + curr[1].length, 0)} of {historyTasks.length} archived tasks
                    </div>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
