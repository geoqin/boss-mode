"use client"

import { useState, useEffect } from "react"
import { Task, NewTask, Category, Subtask, Comment } from "@/app/types"
import { TaskList } from "../components/tasks/Tasklist"
import { TaskForm } from "../components/tasks/TaskForm"
import { TaskEditModal } from "../components/tasks/TaskEditModal"
import { TimelineView } from "../components/timeline/TimelineView"
import { DashboardHeader, FilterBar, ProgressBar } from "@/app/components/dashboard"
import { ErrorBoundary } from "@/app/components/ErrorBoundary"
import { CategoryManager } from "@/app/components/CategoryManager"
import { useAuth } from "@/app/components/auth/AuthProvider"
import { MuiProvider, useTheme } from "@/lib/MuiProvider"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/useNotifications"
import { useBossReminders } from "@/hooks/useBossReminders"
import { getNextDueDate, shouldRevertToIncomplete } from "@/app/utils/taskUtils"
import { getLocalTodayDate } from "@/app/utils/dateUtils"
import { TaskHistoryModal } from "../components/tasks/TaskHistoryModal"
import { ReminderManager } from "../components/ReminderManager"

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')
  const [error, setError] = useState<string | null>(null)
  const { mode: theme, setMode } = useTheme()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [profile, setProfile] = useState<{ first_name: string | null, last_name: string | null }>({ first_name: null, last_name: null })

  // Modal states
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingInstanceDate, setEditingInstanceDate] = useState<string | null>(null)
  const [taskSubtasks, setTaskSubtasks] = useState<Subtask[]>([])
  const [taskComments, setTaskComments] = useState<Comment[]>([])
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const { user, signOut, loading: authLoading } = useAuth()
  const supabase = useState(() => createClient())[0]
  const router = useRouter()
  const { permission, requestPermission, sendTestNotification } = useNotifications()

  // Boss Watch: Reminders
  const { activeAlerts, acknowledge, snooze } = useBossReminders(tasks, notificationsEnabled)

  // Fetch tasks and categories from Supabase
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false)
        return
      }

      // Fetch Tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError)
      }

      // Fetch comment counts (optimization: fetch all comments lightweight)
      const { data: allComments } = await supabase
        .from('comments')
        .select('task_id')
        .eq('user_id', user.id)

      // Map counts
      const counts: Record<string, number> = {}
      allComments?.forEach(c => {
        counts[c.task_id] = (counts[c.task_id] || 0) + 1
      })

      const tasksWithCounts = (tasksData || []).map(t => ({
        ...t,
        comment_count: counts[t.id] || 0
      }))

      setTasks(tasksWithCounts)

      // Fetch Categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)

      if (catData) setCategories(catData)

      // Fetch Preferences
      const { data: prefData } = await supabase
        .from('user_preferences')
        .select('theme, first_name, last_name, notifications_enabled')
        .eq('user_id', user.id)
        .single()

      if (prefData) {
        if (prefData.theme) setMode(prefData.theme as 'light' | 'dark')
        if (prefData.notifications_enabled !== undefined) setNotificationsEnabled(prefData.notifications_enabled)
        setProfile({ first_name: prefData.first_name, last_name: prefData.last_name })
      }

      setLoading(false)
    }

    if (!authLoading) {
      fetchData()
    }
  }, [user, authLoading, supabase])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.className = theme
    document.body.className = theme === 'dark' ? 'bg-[#0f0c29] text-white' : 'bg-gray-50 text-gray-900'
  }, [theme])

  // Fetch subtasks and comments when editing a task
  useEffect(() => {
    async function fetchTaskDetails() {
      if (!editingTask || !user) return

      const [{ data: subtasksData }, { data: commentsData }] = await Promise.all([
        supabase.from('subtasks').select('*').eq('task_id', editingTask.id).order('created_at'),
        supabase.from('comments').select('*').eq('task_id', editingTask.id).order('created_at', { ascending: false })
      ])

      setTaskSubtasks(subtasksData || [])
      setTaskComments(commentsData || [])
    }

    fetchTaskDetails()
  }, [editingTask, user, supabase])

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setMode(newTheme)

    if (user) {
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme: newTheme,
          notifications_enabled: notificationsEnabled
        })
    }
  }

  const toggleNotifications = async () => {
    if (permission !== 'granted') {
      await requestPermission()
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true)
        if (user) {
          await supabase.from('user_preferences').update({ notifications_enabled: true }).eq('user_id', user.id)
        }
      }
    } else {
      const newState = !notificationsEnabled
      setNotificationsEnabled(newState)
      if (user) {
        await supabase.from('user_preferences').update({ notifications_enabled: newState }).eq('user_id', user.id)
      }
      if (newState) sendTestNotification()
    }
  }

  const addTask = async (newTask: NewTask) => {
    if (!user) return
    setError(null)
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: newTask.title,
        category_id: newTask.category_id || null,
        due_date: newTask.due_date || null,
        priority: newTask.priority || 'medium',
        recurrence: newTask.recurrence || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding task:', error)
      setError(`Add Error: ${error.message}`)
    } else if (data) {
      setTasks(prev => [{ ...data, comment_count: 0 }, ...prev])
    }
  }

  const updateTask = async (updates: Partial<Task> & { id: string }) => {
    const { error } = await supabase
      .from('tasks')
      .update({
        title: updates.title,
        due_date: updates.due_date,
        priority: updates.priority,
        recurrence: updates.recurrence,
        category_id: updates.category_id
      })
      .eq('id', updates.id)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === updates.id ? { ...t, ...updates } : t))
    }
  }

  const toggleTask = async (id: string, instanceDate?: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    setError(null)

    let newCompleted = !task.completed
    let newDueDate = task.due_date

    // Handle recurring tasks specially
    if (task.recurrence) {
      if (!task.completed) {
        // Completing a recurring task: Advance due date to next occurrence
        // The task stays "completed" for today but will reappear with new date
        const baseDate = task.due_date ? new Date(task.due_date) : new Date()
        const nextDate = new Date(baseDate)

        switch (task.recurrence) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + 1)
            break
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + 7)
            break
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + 1)
            break
        }

        newDueDate = nextDate.toISOString().split('T')[0]
        // Keep completed = false so it appears as an active task for future date
        newCompleted = false
      } else {
        // Uncompleting a recurring task - just toggle back
        newCompleted = false
      }
    }

    // Optimistic update
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
            ...t,
            completed: newCompleted,
            due_date: newDueDate,
            completed_at: newCompleted ? new Date().toISOString() : null
          }
          : t
      )
    )

    // Persist to Supabase
    const { error } = await supabase
      .from('tasks')
      .update({
        completed: newCompleted,
        due_date: newDueDate,
        completed_at: newCompleted ? new Date().toISOString() : null
      })
      .eq('id', id)

    if (error) {
      setTasks(prev => prev.map(t => t.id === id ? task : t))
    }
  }

  // Restore task from history (un-complete)
  const restoreTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    // Simple toggle back to incomplete
    await toggleTask(id)
  }

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    setError(null)
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      setTasks(prev => [...prev, task])
    }
  }

  // Subtask handlers
  const addSubtask = async (taskId: string, title: string) => {
    if (!user) return
    const { data, error } = await supabase
      .from('subtasks')
      .insert({ task_id: taskId, user_id: user.id, title })
      .select()
      .single()

    if (data) {
      setTaskSubtasks(prev => [...prev, data])
    }
  }

  const toggleSubtask = async (subtaskId: string, completed: boolean) => {
    await supabase.from('subtasks').update({ completed }).eq('id', subtaskId)
    setTaskSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, completed } : s))
  }

  const deleteSubtask = async (subtaskId: string) => {
    await supabase.from('subtasks').delete().eq('id', subtaskId)
    setTaskSubtasks(prev => prev.filter(s => s.id !== subtaskId))
  }

  // Comment handlers
  const addComment = async (taskId: string, content: string, instanceDate?: string | null) => {
    if (!user) return
    const { data, error } = await supabase
      .from('comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        content,
        instance_date: instanceDate || null
      })
      .select()
      .single()

    if (data) {
      setTaskComments(prev => [data, ...prev])
      // Update comment count locally
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, comment_count: (t.comment_count || 0) + 1 } : t
      ))
    }
  }

  const deleteComment = async (commentId: string) => {
    // We need to know task_id to update count... but we can just find it in current comments state
    const comment = taskComments.find(c => c.id === commentId)
    await supabase.from('comments').delete().eq('id', commentId)
    setTaskComments(prev => prev.filter(c => c.id !== commentId))

    if (comment) {
      setTasks(prev => prev.map(t =>
        t.id === comment.task_id ? { ...t, comment_count: (t.comment_count || 1) - 1 } : t
      ))
    }
  }

  // Category handlers
  const addCategory = async (name: string) => {
    if (!user || !name.trim()) return
    if (categories.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) return

    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: name.trim(),
        color: '#8b5cf6'
      })
      .select()
      .single()

    if (data) {
      setCategories(prev => [...prev, data])
    }
  }

  const updateCategory = async (id: string, name: string, color: string) => {
    const { error } = await supabase
      .from('categories')
      .update({ name, color })
      .eq('id', id)

    if (!error) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name, color } : c))
    }
  }

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) {
      setCategories(prev => prev.filter(c => c.id !== id))
      // Tasks with this category will have category_id set to null by DB cascade
      setTasks(prev => prev.map(t => t.category_id === id ? { ...t, category_id: null } : t))
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  const handleEditTask = (task: Task, instanceDate?: string) => {
    setEditingTask(task)
    setEditingInstanceDate(instanceDate || null)
  }

  // --- Filtering Logic for History ---

  const today = getLocalTodayDate()

  // Identify history tasks (completed on previous days)
  const historyTasks = tasks.filter(t => {
    if (!t.completed) return false

    // If completed_at exists, check if it's before today
    if (t.completed_at) {
      return t.completed_at.split('T')[0] < today
    }

    // Fallback: if no completed_at, check due_date
    if (t.due_date) {
      return t.due_date < today
    }

    // If neither (legacy), assume it's history if completed
    return true
  })

  // Current tasks (Active OR Completed Today)
  // We exclude history tasks AND future recurring tasks (as they shouldn't clutter the list yet)
  const currentTasks = tasks.filter(t => {
    // 1. Exclude History
    if (historyTasks.includes(t)) return false

    // 2. Exclude Future Recurring Tasks
    // If it's recurring and due in the future, hide it until due date (rollover)
    // Note: split('T')[0] ensures we compare only the date part, avoiding time discrepancies
    if (t.recurrence && t.due_date && t.due_date.split('T')[0] > today) return false

    return true
  })

  const completedCount = currentTasks.filter(t => t.completed).length
  const totalCount = currentTasks.length
  const isDark = theme === 'dark'
  const displayName = profile.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email || ''

  // Filter and Sort for Main List
  const priorityScore = { high: 3, medium: 2, low: 1 }

  const filteredTasks = currentTasks
    .filter(task => {
      if (filterStatus === 'active' && task.completed) return false
      if (filterStatus === 'completed' && !task.completed) return false
      if (filterCategory !== 'all' && task.category_id !== filterCategory) return false
      return true
    })
    .sort((a, b) => {
      // 1. Priority (High to Low)
      const pA = priorityScore[a.priority || 'medium']
      const pB = priorityScore[b.priority || 'medium']
      if (pA !== pB) return pB - pA

      // 2. Due Date (Ascending - Earliest first)
      // Null due dates go last
      if (a.due_date && b.due_date) {
        if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date)
      } else if (a.due_date) {
        return -1 // a has date, comes first
      } else if (b.due_date) {
        return 1 // b has date, comes first
      }

      // 3. Created Date (Descending - Newest first)
      // Or should it be Ascending to show oldest created first? 
      // User said "by date created". Usually oldest first in todo lists prevents stagnation? 
      // Let's go with Ascending (Oldest first) for consistent "clearing the queue" feel.
      return a.created_at.localeCompare(b.created_at)
    })

  // Timeline should show ALL active tasks, including future recurring ones
  // So we just exclude history (completed past tasks)
  const timelineTasks = tasks.filter(t => !historyTasks.includes(t))
    .filter(task => {
      // Apply category filter if active
      if (filterCategory !== 'all' && task.category_id !== filterCategory) return false
      // Apply status filter if active (though usually timeline shows all)
      if (filterStatus === 'active' && task.completed) return false
      if (filterStatus === 'completed' && !task.completed) return false
      return true
    })

  // Theme styles
  const containerClass = isDark
    ? "min-h-screen bg-gradient-hero"
    : "min-h-screen bg-gray-50 from-indigo-50 to-purple-50 bg-gradient-to-br"
  const textMuted = isDark ? "text-white/40" : "text-gray-500"
  const cardClass = isDark
    ? "glass-card p-6 animate-fade-in"
    : "bg-white shadow-xl rounded-2xl p-6 animate-fade-in border border-gray-100"

  if (authLoading || loading) {
    return (
      <div className={containerClass + " flex items-center justify-center"}>
        <div className={textMuted}>Loading...</div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className={containerClass}>
        {/* Decorative orbs */}
        {isDark && (
          <>
            <div className="fixed top-10 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-10 right-10 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          </>
        )}

        <main className="relative z-10 max-w-xl mx-auto px-6 py-2">
          {/* Pass currentTasks to DashboardHeader so BossFace ignores history tasks */}
          <DashboardHeader
            user={user}
            displayName={displayName}
            isDark={isDark}
            notificationsEnabled={notificationsEnabled}
            onThemeToggle={toggleTheme}
            onNotificationToggle={toggleNotifications}
            onSignOut={handleSignOut}
            tasks={currentTasks}
          />

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in">
              {error}
            </div>
          )}

          <ProgressBar
            completedCount={completedCount}
            totalCount={totalCount}
            isDark={isDark}
          />

          <FilterBar
            isDark={isDark}
            filterStatus={filterStatus}
            filterCategory={filterCategory}
            viewMode={viewMode}
            categories={categories}
            onFilterStatusChange={setFilterStatus}
            onFilterCategoryChange={setFilterCategory}
            onViewModeChange={setViewMode}
            onAddCategory={addCategory}
            onManageCategories={() => setShowCategoryManager(true)}
            onShowHistory={() => setShowHistory(true)}
          />

          {/* Main content card */}
          <div className={cardClass}>
            <TaskForm onAdd={addTask} categories={categories} theme={theme} />

            <div className="mt-4">
              {viewMode === 'list' ? (
                <TaskList
                  tasks={filteredTasks}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onEdit={handleEditTask}
                  theme={theme}
                />
              ) : (
                <TimelineView
                  tasks={timelineTasks}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onEdit={handleEditTask}
                  theme={theme}
                />
              )}
            </div>
          </div>

        </main>

        {/* Task Edit Modal */}
        {
          editingTask && (
            <TaskEditModal
              task={editingTask}
              subtasks={taskSubtasks}
              comments={taskComments}
              categories={categories}
              isDark={isDark}
              instanceDate={editingInstanceDate}
              onClose={() => {
                setEditingTask(null)
                setEditingInstanceDate(null)
                setTaskSubtasks([])
                setTaskComments([])
              }}
              onUpdateTask={updateTask}
              onAddSubtask={addSubtask}
              onToggleSubtask={toggleSubtask}
              onDeleteSubtask={deleteSubtask}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
            />
          )
        }

        {/* Category Manager Modal */}
        {
          showCategoryManager && (
            <CategoryManager
              categories={categories}
              isDark={isDark}
              onClose={() => setShowCategoryManager(false)}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
            />
          )
        }

        {/* Task History Modal */}
        {
          showHistory && (
            <TaskHistoryModal
              historyTasks={historyTasks}
              isDark={isDark}
              onClose={() => setShowHistory(false)}
              onDelete={deleteTask}
              onRestore={restoreTask}
            />
          )
        }

        {/* Reminder Manager */}
        {activeAlerts && activeAlerts.length > 0 && (
          <ReminderManager
            alerts={activeAlerts}
            onAcknowledge={acknowledge}
            onSnooze={snooze}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}