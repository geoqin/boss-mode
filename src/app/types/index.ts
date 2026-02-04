export interface Task {
  id: string
  user_id: string
  category_id: string | null // Deprecated - use tags instead
  title: string
  completed: boolean
  due_date: string | null
  priority: 'low' | 'medium' | 'high'
  recurrence?: 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' | 'custom' | null
  recurrence_interval_days?: number | null // Used when recurrence = 'custom'
  pinned?: boolean // Deprecated - use ongoing instead
  ongoing?: boolean // Ongoing tasks always show in daily view
  parent_task_id?: string | null // For child tasks, references parent task
  depth?: number // 0 = top-level, 1 = child, 2 = grandchild
  show_children_in_timeline?: boolean // Whether child tasks appear independently in timeline
  reminder_minutes_before?: number | null
  sort_order?: number // For manual task ordering within groups
  created_at: string
  completed_at: string | null
  comment_count?: number // Computed field for display
  tags?: { id: string; name: string; color: string }[] // Tags loaded via join
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

// Task with nested subtasks, comments, and child tasks
export interface TaskWithDetails extends Task {
  subtasks?: Subtask[]
  comments?: Comment[]
  child_tasks?: Task[] // For task hierarchy
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

// Track child task completions for recurring parent tasks
export interface ChildTaskCompletion {
  id: string
  child_task_id: string
  parent_task_id: string
  user_id: string
  instance_date: string  // Parent's instance date (YYYY-MM-DD)
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

// Tags - multi-tag support (replacing single category)
export interface Tag {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

// Junction table for task-tag relationships
export interface TaskTag {
  task_id: string
  tag_id: string
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
  recurrence?: 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' | 'custom' | null
  recurrence_interval_days?: number | null
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