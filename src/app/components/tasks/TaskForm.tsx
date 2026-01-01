import { useState } from "react"
import { NewTask, Category } from "@/app/types"

interface TaskFormProps {
  onAdd: (task: NewTask) => Promise<void> | void
  categories: Category[]
  theme?: 'light' | 'dark'
}

export function TaskForm({ onAdd, categories, theme = 'dark' }: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "monthly" | "">("")
  const [categoryId, setCategoryId] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isDark = theme === 'dark'
  const inputClass = isDark
    ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAdd({
        title,
        due_date: dueDate || null,
        priority,
        recurrence: recurrence || null,
        category_id: categoryId || null
      })

      setTitle("")
      setDueDate("")
      setPriority("medium")
      setRecurrence("")
      setCategoryId("")
      setIsExpanded(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'} border rounded-xl p-2 flex gap-2 transition-all shadow-sm w-full items-center`}>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          placeholder="What needs to be done?"
          disabled={isSubmitting}
          className={`flex-1 min-w-0 bg-transparent px-3 py-2 text-sm sm:text-base focus:outline-none placeholder:text-gray-400 ${isDark ? 'text-white' : 'text-gray-900'}`}
        />
        <button
          type="submit"
          className={`btn-primary !py-2 !px-3 sm:!px-6 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 rounded-lg flex items-center justify-center h-10`}
          disabled={isSubmitting || !title.trim()}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="hidden sm:inline">Adding...</span>
            </span>
          ) : (
            <>
              <span className="hidden sm:inline">Add</span>
              <span className="sm:inline-block">→</span>
            </>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="flex flex-wrap gap-4 mt-4 animate-fade-in px-1">
          {/* Due Date */}
          <div className="flex items-center gap-2">
            <span className={isDark ? "text-white/40 text-sm" : "text-gray-400 text-sm"}>📅</span>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              disabled={isSubmitting}
              className={`${inputClass} border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50`}
            />
          </div>

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className={isDark ? "text-white/40 text-sm" : "text-gray-400 text-sm"}>❗</span>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as "low" | "medium" | "high")}
              disabled={isSubmitting}
              className={`${inputClass} border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50`}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>

          {/* Recurrence */}
          <div className="flex items-center gap-2">
            <span className={isDark ? "text-white/40 text-sm" : "text-gray-400 text-sm"}>🔄</span>
            <select
              value={recurrence}
              onChange={e => setRecurrence((e.target.value || "") as "daily" | "weekly" | "monthly" | "")}
              disabled={isSubmitting}
              className={`${inputClass} border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50`}
            >
              <option value="">No Repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2">
            <span className={isDark ? "text-white/40 text-sm" : "text-gray-400 text-sm"}>🏷️</span>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              disabled={isSubmitting}
              className={`${inputClass} border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50`}
            >
              <option value="">No Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </form>
  )
}

