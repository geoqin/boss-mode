"use client"

import { useState } from "react"
import { Category } from "@/app/types"

interface CategoryManagerProps {
    categories: Category[]
    isDark: boolean
    onClose: () => void
    onUpdateCategory: (id: string, name: string, color: string) => Promise<void>
    onDeleteCategory: (id: string) => Promise<void>
}

const PRESET_COLORS = [
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#84cc16', // Lime
]

export function CategoryManager({
    categories,
    isDark,
    onClose,
    onUpdateCategory,
    onDeleteCategory,
}: CategoryManagerProps) {
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editColor, setEditColor] = useState('')
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const inputClass = isDark
        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
        : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"

    const startEdit = (cat: Category) => {
        setEditingId(cat.id)
        setEditName(cat.name)
        setEditColor(cat.color)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName('')
        setEditColor('')
    }

    const handleSave = async () => {
        if (!editingId || !editName.trim()) return
        setSaving(true)
        try {
            await onUpdateCategory(editingId, editName.trim(), editColor)
            cancelEdit()
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        setSaving(true)
        try {
            await onDeleteCategory(id)
            setDeletingId(null)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl animate-fade-in ${isDark ? 'bg-[#1a1035] border border-white/10' : 'bg-white border border-gray-200'
                }`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Manage Categories
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                    {categories.length === 0 ? (
                        <div className={`text-center py-8 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                            <div className="text-4xl mb-2">📁</div>
                            <p>No categories yet</p>
                            <p className="text-sm mt-1">Create categories from the dashboard</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {categories.map(cat => (
                                <li
                                    key={cat.id}
                                    className={`rounded-xl overflow-hidden ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                                >
                                    {editingId === cat.id ? (
                                        // Edit mode
                                        <div className="p-4 space-y-3">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className={`w-full px-3 py-2 rounded-lg border ${inputClass} focus:outline-none text-sm`}
                                                placeholder="Category name"
                                                autoFocus
                                            />

                                            {/* Color picker */}
                                            <div>
                                                <p className={`text-xs mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                    Color
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {PRESET_COLORS.map(color => (
                                                        <button
                                                            key={color}
                                                            onClick={() => setEditColor(color)}
                                                            className={`w-6 h-6 rounded-full transition-transform ${editColor === color ? 'scale-125 ring-2 ring-white/50' : 'hover:scale-110'
                                                                }`}
                                                            style={{ backgroundColor: color }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving || !editName.trim()}
                                                    className="btn-primary !py-1.5 !px-3 text-sm disabled:opacity-50"
                                                >
                                                    {saving ? 'Saving...' : 'Save'}
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className={`px-3 py-1.5 text-sm rounded-lg ${isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : deletingId === cat.id ? (
                                        // Delete confirmation
                                        <div className="p-4">
                                            <p className={`text-sm mb-3 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                                Delete &quot;{cat.name}&quot;? Tasks in this category will become uncategorized.
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    disabled={saving}
                                                    className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                                                >
                                                    {saving ? 'Deleting...' : 'Delete'}
                                                </button>
                                                <button
                                                    onClick={() => setDeletingId(null)}
                                                    className={`px-3 py-1.5 text-sm rounded-lg ${isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View mode
                                        <div className="p-4 flex items-center gap-3">
                                            <div
                                                className="w-4 h-4 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: cat.color }}
                                            />
                                            <span className={`flex-1 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                                {cat.name}
                                            </span>
                                            <button
                                                onClick={() => startEdit(cat)}
                                                className={`text-sm px-2 py-1 rounded ${isDark ? 'text-white/40 hover:text-white/60 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => setDeletingId(cat.id)}
                                                className={`text-sm px-2 py-1 rounded ${isDark ? 'text-white/40 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                                    }`}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <button
                        onClick={onClose}
                        className={`w-full py-2 text-sm rounded-lg transition-colors ${isDark ? 'bg-white/5 text-white/60 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
