export interface Task {
  id: string
  user_id: string
  category_id: string | null
  title: string
  completed: boolean
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  recurrence?: 'daily' | 'weekly' | 'monthly' | null
  reminder_minutes_before?: number | null
  created_at: string
  completed_at: string | null
  comment_count?: number // Computed field for display
}

export interface Subtask {
  id: string
  task_id: string
  user_id: string
  title: string
  completed: boolean
  created_at: string
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  instance_date: string | null // For recurring tasks: which occurrence (YYYY-MM-DD)
  created_at: string
}

// Task with nested subtasks and comments
export interface TaskWithDetails extends Task {
  subtasks?: Subtask[]
  comments?: Comment[]
}

// Virtual instance for timeline view of recurring tasks
export interface RecurringTaskInstance {
  task: Task
  instanceDate: string // YYYY-MM-DD format
  isVirtual: boolean // true = generated instance, false = actual task occurrence
  isCompleted: boolean // Whether this specific instance is completed
  commentCount: number
}

// Track individual completions for recurring tasks (habit-tracker model)
export interface RecurringTaskCompletion {
  id: string
  task_id: string
  user_id: string
  instance_date: string  // YYYY-MM-DD
  completed_at: string
}

// Timeline view configuration
export type TimelineViewMode = 'day' | 'week' | 'month'
export type TaskSortBy = 'type' | 'priority' | 'due'
export type SortOrder = 'asc' | 'desc'

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

export interface UserPreferences {
  user_id: string
  theme: 'light' | 'dark' | 'system'
  notifications_enabled: boolean
  first_name: string | null
  last_name: string | null
  created_at: string
}

export interface TaskHistory {
  id: string
  user_id: string
  task_id: string
  action: 'created' | 'completed' | 'deleted'
  created_at: string
}

// For creating new tasks (without server-generated fields)
export interface NewTask {
  title: string
  category_id?: string | null
  due_date?: string | null
  priority?: 'low' | 'medium' | 'high'
  recurrence?: 'daily' | 'weekly' | 'monthly' | null
  reminder_minutes_before?: number | null
}

// For creating new categories
export interface NewCategory {
  name: string
  color: string
}

// For creating new subtasks
export interface NewSubtask {
  task_id: string
  title: string
}

// For creating new comments
export interface NewComment {
  task_id: string
  content: string
  instance_date?: string | null // For recurring tasks
}