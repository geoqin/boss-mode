"use client"

import { useState } from "react"
import { Task } from "@/app/types"

interface TaskListProps {
  tasks: Task[]
  onToggle: (id: string) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
  onEdit?: (task: Task) => void
  theme?: 'light' | 'dark'
}

import { getNextDueDate, shouldRevertToIncomplete } from "@/app/utils/taskUtils"

export function TaskList({ tasks, onToggle, onDelete, onEdit, theme = 'dark' }: TaskListProps) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const isDark = theme === 'dark'
  const textMuted = isDark ? "text-white/30" : "text-gray-400"
  const textPrimary = isDark ? "text-white/90" : "text-gray-800"
  const textSecondary = isDark ? "text-white/40" : "text-gray-500"
  const itemClass = isDark ? "task-item" : "bg-white border border-gray-100 rounded-xl p-4 transition-all duration-300 hover:shadow-md"

  const handleToggle = async (id: string) => {
    setLoadingIds(prev => new Set(prev).add(id))
    try {
      await onToggle(id)
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleDelete = async (id: string) => {
    setLoadingIds(prev => new Set(prev).add(id))
    try {
      await onDelete(id)
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (tasks.length === 0) {
    return (
      <div className={`mt-8 text-center ${textMuted} py-12`}>
        <div className="text-4xl mb-4">📋</div>
        <p className="text-lg font-medium mb-1">No tasks yet</p>
        <p className="text-sm opacity-75">Add your first task above to get started</p>
      </div>
    )
  }

  return (
    <ul className="mt-6 space-y-3">
      {tasks.map((task, index) => {
        const isLoading = loadingIds.has(task.id)
        const nextDue = getNextDueDate(task)
        const needsRevert = shouldRevertToIncomplete(task)
        const commentCount = task.comment_count || 0

        return (
          <li
            key={task.id}
            className={`${itemClass} animate-slide-in flex items-center gap-4 ${task.completed && !needsRevert ? 'opacity-60' : ''} ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="relative">
              <input
                type="checkbox"
                checked={task.completed && !needsRevert}
                onChange={() => handleToggle(task.id)}
                className="checkbox-custom"
                disabled={isLoading}
                style={!isDark && !(task.completed && !needsRevert) ? { borderColor: '#d1d5db' } : {}}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div
              className="flex flex-col flex-1 cursor-pointer"
              onClick={() => onEdit?.(task)}
            >
              <span className={`block transition-all duration-300 ${task.completed && !needsRevert ? "line-through " + textMuted : textPrimary}`}>
                {task.title}
              </span>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {task.priority !== 'medium' && (
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${task.priority === 'high'
                    ? (isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700')
                    : (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700')
                    }`}>
                    {task.priority}
                  </span>
                )}
                {task.due_date && !task.completed && (
                  <span className={`text-[10px] ${textSecondary} flex items-center gap-1`}>
                    📅 {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
                {task.recurrence && (
                  <span className={`text-[10px] ${isDark ? 'text-purple-300' : 'text-purple-600'} flex items-center gap-1`}>
                    🔄 {task.recurrence}
                    {task.completed && nextDue && (
                      <span className={`ml-1 ${isDark ? 'text-green-300' : 'text-green-600'}`}>
                        → Next: {nextDue.toLocaleDateString()}
                      </span>
                    )}
                  </span>
                )}
                {/* Comment count indicator */}
                {commentCount > 0 && (
                  <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'} flex items-center gap-0.5`}>
                    💬 {commentCount}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(task)
                  }}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'text-white/30 hover:text-white/60 hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  disabled={isLoading}
                  aria-label="Edit task"
                >
                  ✏️
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(task.id)
                }}
                className="btn-delete"
                disabled={isLoading}
                style={!isDark ? { color: '#9ca3af' } : {}}
                aria-label="Delete task"
              >
                {isLoading ? '...' : '✕'}
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
