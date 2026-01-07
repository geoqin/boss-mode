"use client"

import { useState, useEffect } from "react"
import { Task, NewTask, Category, Subtask, Comment, RecurringTaskCompletion, TaskSortBy, SortOrder } from "@/app/types"
import { TaskForm } from "../components/tasks/TaskForm"
import { TaskEditModal } from "../components/tasks/TaskEditModal"
import { TimelineView } from "../components/timeline/TimelineView"
import { DashboardHeader, FilterBar, ProgressBar } from "@/app/components/dashboard"
import { ErrorBoundary } from "@/app/components/ErrorBoundary"
import { CategoryManager } from "@/app/components/CategoryManager"
import { useAuth } from "@/app/components/auth/AuthProvider"
import { useTheme } from "@/lib/MuiProvider"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useNotifications } from "@/hooks/useNotifications"
import { useBossReminders } from "@/hooks/useBossReminders"
import { isInstanceCompleted, getTasksForDate, getMissedTasks, getRecurringInstances } from "@/app/utils/taskUtils"
import { getLocalTodayDate } from "@/app/utils/dateUtils"
import { ReminderManager } from "../components/ReminderManager"

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recurringCompletions, setRecurringCompletions] = useState<RecurringTaskCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  // Use null initially to avoid hydration mismatch, then set on client
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [hideRecurring, setHideRecurring] = useState(false)
  const [sortBy, setSortBy] = useState<TaskSortBy>('type')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [error, setError] = useState<string | null>(null)
  const { mode: theme, setMode } = useTheme()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [profile, setProfile] = useState<{ first_name: string | null, last_name: string | null }>({ first_name: null, last_name: null })
  const [isClient, setIsClient] = useState(false)

  // Modal states
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingInstanceDate, setEditingInstanceDate] = useState<string | null>(null)
  const [taskSubtasks, setTaskSubtasks] = useState<Subtask[]>([])
  const [taskComments, setTaskComments] = useState<Comment[]>([])
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  // Set client-side date to avoid hydration mismatch
  useEffect(() => {
    setSelectedDate(new Date())
    setIsClient(true)
  }, [])

  const { user, signOut, loading: authLoading } = useAuth()
  const supabase = useState(() => createClient())[0]
  const router = useRouter()
  const { permission, requestPermission, sendTestNotification } = useNotifications()

  // Boss Watch: Reminders for upcoming/due tasks
  const { activeAlerts, acknowledge, snooze } = useBossReminders(tasks, notificationsEnabled)

  // Missed recurring tasks notification (runs once per day on load)
  useEffect(() => {
    if (!notificationsEnabled || permission !== 'granted' || tasks.length === 0 || loading) return

    const today = getLocalTodayDate()
    const storageKey = 'boss-mode-missed-tasks-last-check'
    const lastCheck = localStorage.getItem(storageKey)

    if (lastCheck === today) return // Already checked today

    import('@/app/utils/taskUtils').then(({ getMissedTasks }) => {
      const missedTasks = getMissedTasks(tasks, recurringCompletions, today)

      if (missedTasks.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
        const title = missedTasks.length === 1
          ? "Missed Task Yesterday 😅"
          : `${missedTasks.length} Missed Tasks Yesterday 😅`

        const body = missedTasks.length === 1
          ? `You missed: "${missedTasks[0].title}"`
          : `You missed: ${missedTasks.slice(0, 3).map(t => t.title).join(', ')}${missedTasks.length > 3 ? ` and ${missedTasks.length - 3} more` : ''}`

        new Notification(title, { body, icon: '/icon-192x192.png' })
      }

      localStorage.setItem(storageKey, today)
    })
  }, [tasks, recurringCompletions, notificationsEnabled, permission, loading])

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

      // Fetch recurring task completions
      const { data: completionsData } = await supabase
        .from('recurring_task_completions')
        .select('*')
        .eq('user_id', user.id)

      if (completionsData) {
        setRecurringCompletions(completionsData)
      }

      // Check for missed recurring tasks from yesterday (for notification)
      const today = getLocalTodayDate()
      const missedTasks = getMissedTasks(tasksWithCounts, completionsData || [], today)
      if (missedTasks.length > 0 && notificationsEnabled) {
        // TODO: Trigger missed task notification
        console.log('Missed tasks from yesterday:', missedTasks.map(t => t.title))
      }

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
    if (!task || !user) return
    setError(null)

    if (task.recurrence) {
      // RECURRING TASK: Use completions table (habit-tracker model)
      const dateToToggle = instanceDate || getLocalTodayDate()
      const existingCompletion = recurringCompletions.find(
        c => c.task_id === id && c.instance_date === dateToToggle
      )

      if (existingCompletion) {
        // Un-complete: remove from completions table
        setRecurringCompletions(prev => prev.filter(c => c.id !== existingCompletion.id))

        const { error } = await supabase
          .from('recurring_task_completions')
          .delete()
          .eq('id', existingCompletion.id)

        if (error) {
          // Rollback
          setRecurringCompletions(prev => [...prev, existingCompletion])
        }
      } else {
        // Complete: insert into completions table
        const optimisticCompletion: RecurringTaskCompletion = {
          id: crypto.randomUUID(),
          task_id: id,
          user_id: user.id,
          instance_date: dateToToggle,
          completed_at: new Date().toISOString()
        }
        setRecurringCompletions(prev => [...prev, optimisticCompletion])

        const { data, error } = await supabase
          .from('recurring_task_completions')
          .insert({
            task_id: id,
            user_id: user.id,
            instance_date: dateToToggle
          })
          .select()
          .single()

        if (error) {
          // Rollback
          setRecurringCompletions(prev => prev.filter(c => c.id !== optimisticCompletion.id))
        } else if (data) {
          // Update with real ID from server
          setRecurringCompletions(prev =>
            prev.map(c => c.id === optimisticCompletion.id ? data : c)
          )
        }
      }
    } else {
      // ONE-OFF TASK: Toggle completed status on task itself
      const newCompleted = !task.completed

      // Optimistic update
      setTasks(prev =>
        prev.map(t =>
          t.id === id
            ? {
              ...t,
              completed: newCompleted,
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
          completed_at: newCompleted ? new Date().toISOString() : null
        })
        .eq('id', id)

      if (error) {
        setTasks(prev => prev.map(t => t.id === id ? task : t))
      }
    }
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

  // --- Filtering Logic ---
  const today = getLocalTodayDate()
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  // For progress bar: only count tasks that appear in TODAY's view (matching DayView filters)
  const todaysTasks = tasks.filter(task => {
    // Apply category filter
    if (filterCategory !== 'all' && task.category_id !== filterCategory) return false
    // Apply hideRecurring filter
    if (hideRecurring && task.recurrence) return false

    if (task.recurrence) {
      // For recurring tasks: use getRecurringInstances to check if there's an instance today
      const taskInstances = getRecurringInstances(task, todayDate, todayDate)
      return taskInstances.includes(today)
    } else {
      // One-off task - match DayView logic exactly
      const dueDate = task.due_date?.split('T')[0]
      const completedDate = task.completed_at?.split('T')[0]

      // Task is due today - always include (completed or not)
      if (dueDate === today) {
        return true
      }
      // Task was completed today (even if due on different day)
      if (task.completed && completedDate === today) {
        return true
      }
      // No due date - show if not completed OR if completed today
      if (!dueDate) {
        return !task.completed || completedDate === today
      }
      // Overdue - show if not completed
      if (dueDate < today && !task.completed) {
        return true
      }
      return false
    }
  })

  // Calculate completion counts (using new completion tracking for recurring)
  const getTaskCompletedForToday = (task: Task): boolean => {
    if (task.recurrence) {
      return isInstanceCompleted(task.id, today, recurringCompletions)
    }
    return task.completed
  }

  const completedCount = todaysTasks.filter(getTaskCompletedForToday).length
  const totalCount = todaysTasks.length
  const isDark = theme === 'dark'
  const displayName = profile.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : user?.email || ''

  // Filter and Sort for Main List
  const priorityScore = { high: 3, medium: 2, low: 1 }

  const filteredTasks = todaysTasks
    .filter(task => {
      if (filterCategory !== 'all' && task.category_id !== filterCategory) return false
      if (hideRecurring && task.recurrence) return false
      return true
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'type':
          comparison = (a.recurrence ? 1 : 0) - (b.recurrence ? 1 : 0)
          break
        case 'priority':
          const pA = priorityScore[a.priority || 'medium']
          const pB = priorityScore[b.priority || 'medium']
          comparison = pB - pA
          break
        case 'due':
          const dateA = a.due_date || ''
          const dateB = b.due_date || ''
          comparison = dateA.localeCompare(dateB)
          break
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })

  // Timeline tasks - all tasks for timeline views
  const timelineTasks = tasks.filter(task => {
    if (filterCategory !== 'all' && task.category_id !== filterCategory) return false
    if (hideRecurring && task.recurrence) return false
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
            <div className="fixed top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="fixed bottom-10 right-10 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
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
            tasks={todaysTasks.map(t => ({
              ...t,
              completed: getTaskCompletedForToday(t)
            }))}
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
            filterCategory={filterCategory}
            viewMode={viewMode}
            selectedDate={selectedDate || new Date()}
            categories={categories}
            hideRecurring={hideRecurring}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onFilterCategoryChange={setFilterCategory}
            onViewModeChange={setViewMode}
            onDateChange={setSelectedDate}
            onHideRecurringChange={setHideRecurring}
            onSortChange={(newSortBy, newOrder) => {
              setSortBy(newSortBy)
              setSortOrder(newOrder)
            }}
            onAddCategory={addCategory}
            onManageCategories={() => setShowCategoryManager(true)}
          />

          {/* Main content card */}
          <div className={cardClass}>
            <TaskForm onAdd={addTask} categories={categories} theme={theme} />

            <div className="mt-4">
              <TimelineView
                tasks={timelineTasks}
                recurringCompletions={recurringCompletions}
                viewMode={viewMode}
                selectedDate={selectedDate || new Date()}
                hideRecurring={hideRecurring}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onDateChange={setSelectedDate}
                onViewModeChange={setViewMode}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onEdit={handleEditTask}
                onHideRecurringChange={setHideRecurring}
                theme={theme}
              />
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
              onDeleteTask={async (taskId) => {
                await deleteTask(taskId)
                setEditingTask(null)
                setEditingInstanceDate(null)
              }}
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