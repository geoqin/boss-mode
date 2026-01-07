"use client"

import { useState } from "react"
import { Category } from "@/app/types"
import { DatePicker } from "@mui/x-date-pickers"

interface FilterBarProps {
    isDark: boolean
    filterCategory: string
    viewMode: 'day' | 'week' | 'month'
    selectedDate: Date
    categories: Category[]
    hideRecurring?: boolean
    sortBy?: 'type' | 'priority' | 'due'
    sortOrder?: 'asc' | 'desc'
    onFilterCategoryChange: (categoryId: string) => void
    onViewModeChange: (mode: 'day' | 'week' | 'month') => void
    onDateChange: (date: Date) => void
    onHideRecurringChange?: (hide: boolean) => void
    onSortChange?: (sortBy: 'type' | 'priority' | 'due', order: 'asc' | 'desc') => void
    onAddCategory: (name: string) => void
    onManageCategories?: () => void
}

export function FilterBar({
    isDark,
    filterCategory,
    viewMode,
    selectedDate,
    categories,
    hideRecurring = false,
    sortBy = 'type',
    sortOrder = 'asc',
    onFilterCategoryChange,
    onViewModeChange,
    onDateChange,
    onHideRecurringChange,
    onSortChange,
    onAddCategory,
    onManageCategories
}: FilterBarProps) {
    const textMuted = isDark ? "text-white/40" : "text-gray-500"
    const textHover = isDark ? "hover:text-white/60" : "hover:text-gray-700"
    const inputClass = isDark
        ? "bg-white/5 text-white/80 border-white/10 focus:border-white/20"
        : "bg-gray-100 text-gray-800 border-gray-200 focus:border-purple-300"
    const filterBtnActive = isDark
        ? "bg-white/20 text-white shadow-sm"
        : "bg-orange-100 text-orange-700 font-medium"
    const filterBtnInactive = isDark
        ? "text-white/40 hover:text-white/60"
        : "text-gray-500 hover:text-gray-700"

    const [showDatePicker, setShowDatePicker] = useState(false)

    const isToday = () => {
        const today = new Date()
        return selectedDate.toDateString() === today.toDateString()
    }

    const goToToday = () => {
        onDateChange(new Date())
        onViewModeChange('day')
    }

    const navigatePrev = () => {
        const newDate = new Date(selectedDate)
        switch (viewMode) {
            case 'day':
                newDate.setDate(newDate.getDate() - 1)
                break
            case 'week':
                newDate.setDate(newDate.getDate() - 7)
                break
            case 'month':
                newDate.setMonth(newDate.getMonth() - 1)
                break
        }
        onDateChange(newDate)
    }

    const navigateNext = () => {
        const newDate = new Date(selectedDate)
        switch (viewMode) {
            case 'day':
                newDate.setDate(newDate.getDate() + 1)
                break
            case 'week':
                newDate.setDate(newDate.getDate() + 7)
                break
            case 'month':
                newDate.setMonth(newDate.getMonth() + 1)
                break
        }
        onDateChange(newDate)
    }

    const getDateLabel = () => {
        switch (viewMode) {
            case 'day':
                if (isToday()) return 'Today'
                const yesterday = new Date()
                yesterday.setDate(yesterday.getDate() - 1)
                if (selectedDate.toDateString() === yesterday.toDateString()) return 'Yesterday'
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                if (selectedDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
                return selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            case 'week':
                const weekStart = new Date(selectedDate)
                weekStart.setDate(weekStart.getDate() - weekStart.getDay())
                const weekEnd = new Date(weekStart)
                weekEnd.setDate(weekEnd.getDate() + 6)
                return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            case 'month':
                return selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
        }
    }

    const showSortControls = viewMode === 'day'

    return (
        <div className="flex flex-col gap-4 mb-6 animate-fade-in">
            {/* Top Bar: Date Navigation & View Mode */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left: Navigation arrows and date */}
                <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-2">
                    <button
                        onClick={navigatePrev}
                        className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="Previous"
                    >
                        ←
                    </button>

                    {/* Clickable date label with DatePicker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`text-lg font-semibold min-w-[160px] text-center px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2
                                ${isDark
                                    ? 'text-white hover:bg-white/10'
                                    : 'text-gray-900 hover:bg-gray-100'}`}
                            title="Click to pick a date"
                        >
                            📅 {getDateLabel()}
                        </button>

                        {/* DatePicker Popup */}
                        {showDatePicker && (
                            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 rounded-xl shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                                <DatePicker
                                    value={selectedDate}
                                    onChange={(newDate) => {
                                        if (newDate) {
                                            onDateChange(newDate)
                                        }
                                        setShowDatePicker(false)
                                    }}
                                    open={true}
                                    onClose={() => setShowDatePicker(false)}
                                    slotProps={{
                                        textField: { style: { display: 'none' } }
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={navigateNext}
                        className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="Next"
                    >
                        →
                    </button>
                    {/* Today Button - Hide on tiny screens, show on mobile */}
                    {!isToday() && (
                        <button
                            onClick={goToToday}
                            className={`hidden sm:block ml-2 px-3 py-1 text-sm rounded transition-all ${isDark ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                        >
                            ↩ Today
                        </button>
                    )}
                </div>

                {/* Right: View Mode Buttons - Full width on mobile for easier tapping */}
                <div className={`flex items-center justify-center gap-2 rounded p-1 w-full md:w-auto ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <span className={`text-sm font-bold px-2 ${textMuted}`}>View:</span>
                    <button
                        onClick={() => onViewModeChange('day')}
                        className={`flex-1 md:flex-none px-3 py-1 text-sm rounded transition-all ${viewMode === 'day' ? filterBtnActive : filterBtnInactive}`}
                        title="Day View"
                    >
                        Day
                    </button>
                    <button
                        onClick={() => onViewModeChange('week')}
                        className={`flex-1 md:flex-none px-3 py-1 text-sm rounded transition-all ${viewMode === 'week' ? filterBtnActive : filterBtnInactive}`}
                        title="Week View"
                    >
                        Week
                    </button>
                    <button
                        onClick={() => onViewModeChange('month')}
                        className={`flex-1 md:flex-none px-3 py-1 text-sm rounded transition-all ${viewMode === 'month' ? filterBtnActive : filterBtnInactive}`}
                        title="Month View"
                    >
                        Month
                    </button>
                </div>
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-col min-[450px]:flex-row items-center justify-between gap-1 w-full">
                {/* Category Filter + Add Category */}
                <div className="flex items-center gap-2 w-full min-[450px]:w-auto min-[450px]:flex-1 min-w-0 mr-0">
                    <select
                        value={filterCategory}
                        onChange={(e) => onFilterCategoryChange(e.target.value)}
                        className={`${inputClass} text-sm rounded px-3 py-1 focus:outline-none max-w-[140px] border`}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    {onManageCategories && (
                        <button
                            onClick={onManageCategories}
                            className={`text-sm px-2 py-1 rounded transition-colors ${isDark ? 'text-white/40 hover:text-white/60 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                            title="Manage Categories"
                        >
                            ⚙️
                        </button>
                    )}

                    {/* Add Category (always next to category filter) */}
                    <input
                        type="text"
                        placeholder="New Category"
                        className={`${inputClass} text-sm rounded px-2 py-1 focus:outline-none flex-1 min-w-[40px] border`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onAddCategory(e.currentTarget.value)
                                e.currentTarget.value = ''
                            }
                        }}
                    />
                    <button
                        className={`${textMuted} ${textHover} text-lg px-1`}
                        onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement
                            if (input && input.value) {
                                onAddCategory(input.value)
                                input.value = ''
                            }
                        }}
                    >
                        +
                    </button>
                </div>

                {/* Sort Controls (Day view only) - on same line as category */}
                {onSortChange && showSortControls && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-sm ${textMuted}`}>Sort:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value as 'type' | 'priority' | 'due', sortOrder)}
                            className={`${inputClass} text-sm rounded px-2 py-1 border focus:outline-none`}
                        >
                            <option value="type">Type</option>
                            <option value="priority">Priority</option>
                            <option value="due">Due Date</option>
                        </select>
                        <button
                            onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
                            className={`text-sm px-2 py-1 rounded transition-colors ${filterBtnInactive}`}
                            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                        >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
