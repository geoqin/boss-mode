"use client"

import { useState, useEffect } from "react"
import { Task, Subtask, Comment, Category } from "@/app/types"

interface TaskEditModalProps {
    task: Task
    subtasks: Subtask[]
    comments: Comment[]
    categories: Category[]
    isDark: boolean
    instanceDate?: string | null // For recurring task instances
    onClose: () => void
    onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>
    onAddSubtask: (taskId: string, title: string) => Promise<void>
    onToggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>
    onDeleteSubtask: (subtaskId: string) => Promise<void>
    onAddComment: (taskId: string, content: string, instanceDate?: string | null) => Promise<void>
    onDeleteComment: (commentId: string) => Promise<void>
}

export function TaskEditModal({
    task,
    subtasks,
    comments,
    categories,
    isDark,
    instanceDate,
    onClose,
    onUpdateTask,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask,
    onAddComment,
    onDeleteComment,
}: TaskEditModalProps) {
    const [title, setTitle] = useState(task.title)
    const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '')
    const [priority, setPriority] = useState(task.priority)
    const [recurrence, setRecurrence] = useState(task.recurrence || '')
    const [categoryId, setCategoryId] = useState(task.category_id || '')
    const [newSubtask, setNewSubtask] = useState('')
    const [newComment, setNewComment] = useState('')
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'comments'>('details')

    // Filter comments for this instance if applicable
    const displayedComments = comments.filter(c => {
        if (!task.recurrence) return true // Show all for non-recurring
        if (instanceDate) return c.instance_date === instanceDate // Show only matching instance
        return !c.instance_date // Show general comments if no instance date (list view?)
    })

    const inputClass = isDark
        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
        : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"

    const labelClass = isDark ? "text-white/60" : "text-gray-600"

    const handleSave = async () => {
        setSaving(true)
        try {
            await onUpdateTask({
                id: task.id,
                title,
                due_date: dueDate || null,
                priority,
                recurrence: (recurrence || null) as 'daily' | 'weekly' | 'monthly' | null,
                category_id: categoryId || null,
            })
            onClose()
        } finally {
            setSaving(false)
        }
    }

    const handleAddSubtask = async () => {
        if (!newSubtask.trim()) return
        await onAddSubtask(task.id, newSubtask.trim())
        setNewSubtask('')
    }

    const handleAddComment = async () => {
        if (!newComment.trim()) return
        await onAddComment(task.id, newComment.trim(), instanceDate)
        setNewComment('')
    }

    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose])

    const tabClass = (tab: string) =>
        `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab
            ? (isDark ? 'bg-white/10 text-white' : 'bg-purple-100 text-purple-700')
            : (isDark ? 'text-white/40 hover:text-white/60' : 'text-gray-500 hover:text-gray-700')
        }`

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl animate-fade-in ${isDark ? 'bg-[#1a1035] border border-white/10' : 'bg-white border border-gray-200'
                }`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Edit Task
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4">
                        <button className={tabClass('details')} onClick={() => setActiveTab('details')}>
                            Details
                        </button>
                        <button className={tabClass('subtasks')} onClick={() => setActiveTab('subtasks')}>
                            Subtasks ({subtasks.length})
                        </button>
                        <button className={tabClass('comments')} onClick={() => setActiveTab('comments')}>
                            Comments ({displayedComments.length})
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'details' && (
                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>Task Name</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border ${inputClass} focus:outline-none`}
                                    placeholder="Task name"
                                />
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>Due Date</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border ${inputClass} focus:outline-none`}
                                />
                            </div>

                            {/* Priority */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>Priority</label>
                                <select
                                    value={priority}
                                    onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                                    className={`w-full px-3 py-2 rounded-lg border ${inputClass} focus:outline-none`}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>

                            {/* Recurrence */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>Recurrence</label>
                                <select
                                    value={recurrence}
                                    onChange={e => setRecurrence(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border ${inputClass} focus:outline-none`}
                                >
                                    <option value="">No Repeat</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${labelClass}`}>Category</label>
                                <select
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border ${inputClass} focus:outline-none`}
                                >
                                    <option value="">No Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'subtasks' && (
                        <div className="space-y-3">
                            {/* Add subtask */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newSubtask}
                                    onChange={e => setNewSubtask(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                                    placeholder="Add a subtask..."
                                    className={`flex-1 px-3 py-2 rounded-lg border ${inputClass} focus:outline-none text-sm`}
                                />
                                <button
                                    onClick={handleAddSubtask}
                                    disabled={!newSubtask.trim()}
                                    className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>

                            {/* Subtask list */}
                            {subtasks.length === 0 ? (
                                <div className={`text-center py-8 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                    <div className="text-3xl mb-2">📝</div>
                                    <p className="text-sm">No subtasks yet</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {subtasks.map(subtask => (
                                        <li
                                            key={subtask.id}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={subtask.completed}
                                                onChange={() => onToggleSubtask(subtask.id, !subtask.completed)}
                                                className="checkbox-custom w-5 h-5"
                                            />
                                            <span className={`flex-1 text-sm ${subtask.completed
                                                ? (isDark ? 'line-through text-white/30' : 'line-through text-gray-400')
                                                : (isDark ? 'text-white/80' : 'text-gray-700')
                                                }`}>
                                                {subtask.title}
                                            </span>
                                            <button
                                                onClick={() => onDeleteSubtask(subtask.id)}
                                                className={`text-sm ${isDark ? 'text-white/30 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                                            >
                                                ✕
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {activeTab === 'comments' && (
                        <div className="space-y-3">
                            {/* Add comment */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                                    placeholder="Add a comment..."
                                    className={`flex-1 px-3 py-2 rounded-lg border ${inputClass} focus:outline-none text-sm`}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                    className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>

                            {/* Comments list */}
                            {displayedComments.length === 0 ? (
                                <div className={`text-center py-8 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                    <div className="text-3xl mb-2">💬</div>
                                    <p className="text-sm">No comments yet</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {displayedComments.map(comment => (
                                        <li
                                            key={comment.id}
                                            className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm flex-1 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                                    {comment.content}
                                                </p>
                                                <button
                                                    onClick={() => onDeleteComment(comment.id)}
                                                    className={`text-sm ${isDark ? 'text-white/30 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !title.trim()}
                        className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
