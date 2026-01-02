import { useState, useRef, useEffect } from "react"
import { NewTask, Category } from "@/app/types"
import { getLocalTodayDate } from "@/app/utils/dateUtils"

interface TaskFormProps {
  onAdd: (task: NewTask) => Promise<void> | void
  categories: Category[]
  theme?: 'light' | 'dark'
}

export function TaskForm({ onAdd, categories, theme = 'dark' }: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [dueTime, setDueTime] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "monthly" | "">("")
  const [categoryId, setCategoryId] = useState("")
  const [reminder, setReminder] = useState<string>("") // string for select, parsed to number
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (formRef.current && !formRef.current.contains(event.target as Node) && !isSubmitting) {
        setIsExpanded(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSubmitting])

  const isDark = theme === 'dark'
  const inputClass = isDark
    ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"

  const labelClass = isDark ? "text-white/60 text-xs font-medium" : "text-gray-500 text-xs font-medium"

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      let finalDueDate = dueDate || null

      // Smart date logic if time is set but date is not
      if (dueTime && !finalDueDate) {
        const today = getLocalTodayDate()
        const now = new Date()
        const [hours, minutes] = dueTime.split(':').map(Number)

        // Compare time
        const currentHours = now.getHours()
        const currentMinutes = now.getMinutes()

        if (hours > currentHours || (hours === currentHours && minutes > currentMinutes)) {
          finalDueDate = today // Today
        } else {
          // Tomorrow
          const tomorrow = new Date(now)
          tomorrow.setDate(tomorrow.getDate() + 1)
          finalDueDate = tomorrow.toISOString().split('T')[0]
        }
      }

      // Combine date and time
      let isoDate = null
      if (finalDueDate) {
        if (dueTime) {
          isoDate = `${finalDueDate}T${dueTime}:00`
        } else {
          isoDate = finalDueDate // Just date
        }
      }

      await onAdd({
        title,
        due_date: isoDate,
        priority,
        recurrence: recurrence || null,
        category_id: categoryId || null,
        reminder_minutes_before: reminder ? parseInt(reminder) : null
      })

      setTitle("")
      setDueDate("")
      setDueTime("")
      setPriority("medium")
      setRecurrence("")
      setCategoryId("")
      setReminder("")
      setIsExpanded(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reminder is only available if due date AND time are set (or at least inferred, but UI enforces set)
  // Logic check: "If the due date and time is not set, this option is not available."
  // Note: We infer date if time is set, so effectively if Time is set, we can have reminder.
  const canSetReminder = !!dueTime

  return (
    <form ref={formRef} onSubmit={submit} className="w-full">
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
          <div className="flex flex-col gap-1">
            <span className={labelClass}>Due Date</span>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              disabled={isSubmitting}
              className={`${inputClass} border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50`}
            />
          </div>

          {/* Time */}
          <div className="flex flex-col gap-1">
            <span className={labelClass}>Time</span>
            <input
              type="time"
              value={dueTime}
              onChange={e => setDueTime(e.target.value)}
              disabled={isSubmitting}
              className={`${inputClass} border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50`}
            />
          </div>

          {/* Reminder - Only if Time is set */}
          <div className={`flex flex-col gap-1 ${!canSetReminder ? 'opacity-50' : ''}`}>
            <span className={labelClass}>Remind Me</span>
            <select
              value={reminder}
              onChange={e => setReminder(e.target.value)}
              disabled={isSubmitting || !canSetReminder}
              className={`${inputClass} border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50 cursor-pointer`}
            >
              <option value="">None</option>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1">
            <span className={labelClass}>Priority</span>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as "low" | "medium" | "high")}
              disabled={isSubmitting}
              className={`${inputClass} border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Recurrence */}
          <div className="flex flex-col gap-1">
            <span className={labelClass}>Repeat</span>
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
          <div className="flex flex-col gap-1">
            <span className={labelClass}>Category</span>
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
