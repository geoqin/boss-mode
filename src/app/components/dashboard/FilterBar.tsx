"use client"

import { Category } from "@/app/types"

interface FilterBarProps {
    isDark: boolean
    filterStatus: 'all' | 'active' | 'completed'
    filterCategory: string
    viewMode: 'list' | 'timeline'
    categories: Category[]
    onFilterStatusChange: (status: 'all' | 'active' | 'completed') => void
    onFilterCategoryChange: (categoryId: string) => void
    onViewModeChange: (mode: 'list' | 'timeline') => void
    onAddCategory: (name: string) => void
    onManageCategories?: () => void
    onShowHistory?: () => void
}

export function FilterBar({
    isDark,
    filterStatus,
    filterCategory,
    viewMode,
    categories,
    onFilterStatusChange,
    onFilterCategoryChange,
    onViewModeChange,
    onAddCategory,
    onManageCategories,
    onShowHistory
}: FilterBarProps) {
    const textMuted = isDark ? "text-white/40" : "text-gray-500"
    const textHover = isDark ? "hover:text-white/60" : "hover:text-gray-700"
    const inputClass = isDark
        ? "bg-white/5 text-white/80 border-white/10 focus:border-white/20"
        : "bg-gray-100 text-gray-800 border-gray-200 focus:border-purple-300"
    const filterBtnActive = isDark
        ? "bg-white/20 text-white shadow-sm"
        : "bg-purple-100 text-purple-700 font-medium"
    const filterBtnInactive = isDark
        ? "text-white/40 hover:text-white/60"
        : "text-gray-500 hover:text-gray-700"

    return (
        <div className="flex flex-col gap-4 mb-6 animate-fade-in">
            {/* Top row: Status Filter + View Toggle */}
            {/* Top row: Status Filter + View Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
                <div className={`grid grid-cols-3 w-full sm:w-auto sm:flex rounded p-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    {(['all', 'active', 'completed'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => onFilterStatusChange(status)}
                            className={`px-3 py-1 text-sm rounded transition-all whitespace-nowrap ${filterStatus === status ? filterBtnActive : filterBtnInactive}`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                <div className={`grid grid-cols-2 w-full sm:w-auto sm:flex rounded p-1 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`px-3 py-1 text-sm rounded transition-all justify-center flex ${viewMode === 'list' ? filterBtnActive : filterBtnInactive}`}
                        title="List View"
                    >
                        📝 List
                    </button>
                    <button
                        onClick={() => onViewModeChange('timeline')}
                        className={`px-3 py-1 text-sm rounded transition-all justify-center flex ${viewMode === 'timeline' ? filterBtnActive : filterBtnInactive}`}
                        title="Timeline View"
                    >
                        📅 Timeline
                    </button>
                    {onShowHistory && (
                        <button
                            onClick={onShowHistory}
                            className={`px-3 py-1 text-sm rounded transition-all justify-center flex ${filterBtnInactive}`}
                            title="View completed tasks history"
                        >
                            🕰️ History
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom row: Category + New Category + Manage */}
            <div className="flex items-center gap-2">
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
                        className={`text-sm px-2 py-1 rounded transition-colors ${isDark ? 'text-white/40 hover:text-white/60 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        title="Manage Categories"
                    >
                        ⚙️
                    </button>
                )}

                <div className="flex items-center gap-1 ml-auto sm:ml-2">
                    <input
                        type="text"
                        placeholder="New Cat..."
                        className={`${inputClass} text-sm rounded px-2 py-1 focus:outline-none w-24 border`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onAddCategory(e.currentTarget.value)
                                e.currentTarget.value = ''
                            }
                        }}
                    />
                    <button
                        className={`${textMuted} ${textHover} text-lg px-2`}
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
            </div>
        </div>
    )
}

