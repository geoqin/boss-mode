"use client"

import { useState, useEffect } from "react"
import { Task, Category, Tag, Subtask, Comment, ChildTaskCompletion } from "@/app/types"
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    FormControlLabel,
    InputLabel,
    Tabs,
    Tab,
    Box,
    Stack,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Checkbox,
    Switch,
    Typography,
    Divider,
    CircularProgress,
    Chip,
} from "@mui/material"
import { DatePicker, TimePicker } from "@mui/x-date-pickers"
import { parse, format } from "date-fns"
import { useDeleteConfirm } from "@/app/components/DeleteConfirmProvider"
import { formatLocalDateTime } from "@/app/utils/dateUtils"

interface TaskEditModalProps {
    task: Task
    parentTask?: Task | null // Parent task for containment validation
    subtasks: Subtask[]
    comments: Comment[]
    childTasks: Task[]
    categories: Category[]
    tags: Tag[]
    isDark: boolean
    instanceDate?: string | null
    onClose: () => void
    onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>
    onDeleteTask: (taskId: string) => Promise<void>
    onAddSubtask: (taskId: string, title: string) => Promise<void>
    onToggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>
    onDeleteSubtask: (subtaskId: string) => Promise<void>
    onAddChildTask: (parentTaskId: string, title: string) => Promise<void>
    childTaskCompletions: ChildTaskCompletion[]
    onToggleChildTask: (childTaskId: string, parentInstanceDate?: string) => Promise<void>
    onDeleteChildTask: (childTaskId: string) => Promise<void>
    onEditChildTask: (childTask: Task) => void
    onAddComment: (taskId: string, content: string, instanceDate?: string | null) => Promise<void>
    onUpdateComment: (commentId: string, content: string) => Promise<void>
    onDeleteComment: (commentId: string) => Promise<void>
    onAddTag?: (name: string, color?: string) => Promise<Tag | null>
    onAddTagToTask?: (taskId: string, tagId: string) => Promise<void>
    onRemoveTagFromTask?: (taskId: string, tagId: string) => Promise<void>
}

interface TabPanelProps {
    children?: React.ReactNode
    index: number
    value: number
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props
    return (
        <div hidden={value !== index} {...other}>
            {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
        </div>
    )
}

export function TaskEditModal({
    task,
    parentTask,
    subtasks,
    comments,
    childTasks,
    categories,
    tags,
    isDark,
    instanceDate,
    onClose,
    onUpdateTask,
    onDeleteTask,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask,
    onAddChildTask,
    childTaskCompletions,
    onToggleChildTask,
    onDeleteChildTask,
    onEditChildTask,
    onAddComment,
    onUpdateComment,
    onDeleteComment,
    onAddTag,
    onAddTagToTask,
    onRemoveTagFromTask,
}: TaskEditModalProps) {
    const { confirmDelete } = useDeleteConfirm()

    // Containment validation:
    // - Subtasks can NEVER be ongoing (ongoing is only for top-level persistent lists)
    // - Regular parent: children cannot be recurring
    // - Recurring/Ongoing parent: children can be regular or recurring
    const isSubtask = !!parentTask || !!task.parent_task_id
    const isChildOfRegular = parentTask && !parentTask.ongoing && !parentTask.recurrence
    const canBeOngoing = !isSubtask // Subtasks can never be ongoing
    const canBeRecurring = !isChildOfRegular

    const [title, setTitle] = useState(task.title)

    // Parse date and time from ISO string
    const [dueDate, setDueDate] = useState<Date | null>(() => {
        if (task.due_date) {
            const dateStr = task.due_date.split('T')[0]
            return parse(dateStr, 'yyyy-MM-dd', new Date())
        }
        return null
    })

    const [dueTime, setDueTime] = useState<Date | null>(() => {
        if (task.due_date && task.due_date.includes('T')) {
            return new Date(task.due_date)
        }
        return null
    })

    const [priority, setPriority] = useState(task.priority)
    const [recurrence, setRecurrence] = useState<'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' | 'custom' | ''>(task.recurrence || '')
    const [customIntervalDays, setCustomIntervalDays] = useState<number | ''>(task.recurrence_interval_days || '')
    const [ongoing, setOngoing] = useState(task.ongoing || false)
    const [taskTags, setTaskTags] = useState<{ id: string; name: string; color: string }[]>(task.tags || [])
    const [reminder, setReminder] = useState<string>(task.reminder_minutes_before?.toString() || '')

    const [newSubtask, setNewSubtask] = useState('')
    const [newChildTask, setNewChildTask] = useState('')
    const [newComment, setNewComment] = useState('')
    const [saving, setSaving] = useState(false)
    const [tabValue, setTabValue] = useState(0)

    // Comment editing state
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
    const [editingCommentContent, setEditingCommentContent] = useState('')

    // Reset form state when task changes (e.g., switching to child task)
    useEffect(() => {
        setTitle(task.title)
        setPriority(task.priority)
        setRecurrence(task.recurrence || '')
        setCustomIntervalDays(task.recurrence_interval_days || '')
        setOngoing(task.ongoing || false)
        setTaskTags(task.tags || [])
        setReminder(task.reminder_minutes_before?.toString() || '')
        setTabValue(0)

        // Reset date/time
        if (task.due_date) {
            const dateStr = task.due_date.split('T')[0]
            setDueDate(parse(dateStr, 'yyyy-MM-dd', new Date()))
            if (task.due_date.includes('T')) {
                setDueTime(new Date(task.due_date))
            } else {
                setDueTime(null)
            }
        } else {
            setDueDate(null)
            setDueTime(null)
        }
    }, [task.id]) // Re-run when task ID changes

    // Show all comments for the task (including all recurrence instances)
    const displayedComments = comments

    const handleSave = async () => {
        setSaving(true)
        try {
            let isoDate: string | null = null
            if (dueDate) {
                if (dueTime) {
                    const combined = new Date(dueDate)
                    combined.setHours(dueTime.getHours(), dueTime.getMinutes(), 0)
                    isoDate = formatLocalDateTime(combined)
                } else {
                    isoDate = format(dueDate, 'yyyy-MM-dd')
                }
            }

            await onUpdateTask({
                id: task.id,
                title,
                due_date: isoDate,
                priority,
                recurrence: (recurrence || null) as typeof task.recurrence,
                recurrence_interval_days: recurrence === 'custom' && customIntervalDays ? customIntervalDays : null,
                ongoing,
                reminder_minutes_before: reminder ? parseInt(reminder) : null
            })
            onClose()
        } finally {
            setSaving(false)
        }
    }

    // Request notification permission when reminder is selected
    useEffect(() => {
        if (reminder && typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission()
            }
        }
    }, [reminder])

    const handleAddSubtask = async () => {
        if (!newSubtask.trim()) return
        await onAddSubtask(task.id, newSubtask.trim())
        setNewSubtask('')
    }

    const handleAddChildTask = async () => {
        if (!newChildTask.trim()) return
        await onAddChildTask(task.id, newChildTask.trim())
        setNewChildTask('')
    }

    const handleAddComment = async () => {
        if (!newComment.trim()) return
        await onAddComment(task.id, newComment.trim(), instanceDate)
        setNewComment('')
    }

    const handleUpdateComment = async () => {
        if (!editingCommentId || !editingCommentContent.trim()) return
        await onUpdateComment(editingCommentId, editingCommentContent.trim())
        setEditingCommentId(null)
        setEditingCommentContent('')
    }

    const startEditingComment = (comment: Comment) => {
        setEditingCommentId(comment.id)
        setEditingCommentContent(comment.content)
    }

    const cancelEditingComment = () => {
        setEditingCommentId(null)
        setEditingCommentContent('')
    }

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [onClose])

    const canSetReminder = !!dueTime

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    borderRadius: 4,
                }
            }}
        >
            <DialogTitle sx={{ pb: 0 }}>
                Edit Task
            </DialogTitle>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, v) => setTabValue(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        '& .MuiTabs-indicator': { backgroundColor: '#f97316 !important' },
                        '& .Mui-selected': { color: '#f97316 !important' },
                        '& .MuiTabs-scrollButtons': { color: 'text.primary' }
                    }}
                >
                    <Tab label="Details" />
                    <Tab label={`Subtasks (${childTasks.length})`} />
                    <Tab label={`Comments (${displayedComments.length})`} />
                </Tabs>
            </Box>

            <DialogContent sx={{ pt: 2 }}>
                <TabPanel value={tabValue} index={0}>
                    <Stack spacing={3}>
                        <TextField
                            label="Task Name"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            fullWidth
                        />

                        <Stack direction="row" spacing={2}>
                            <DatePicker
                                label="Due Date"
                                value={dueDate}
                                onChange={setDueDate}
                                disabled={ongoing}
                                slotProps={{ textField: { fullWidth: true, disabled: ongoing, helperText: ongoing ? 'Ongoing tasks have no due date' : undefined } }}
                            />
                            <TimePicker
                                label="Time"
                                value={dueTime}
                                onChange={setDueTime}
                                disabled={ongoing}
                                slotProps={{ textField: { fullWidth: true, disabled: ongoing } }}
                            />
                        </Stack>

                        <FormControl fullWidth size="small" disabled={!canSetReminder}>
                            <InputLabel id="reminder-label">Remind Me</InputLabel>
                            <Select
                                labelId="reminder-label"
                                id="reminder-select"
                                value={reminder}
                                onChange={e => setReminder(e.target.value)}
                                label="Remind Me"
                                size="small"
                            >
                                <MenuItem value="">None</MenuItem>
                                <MenuItem value="15">15 minutes before</MenuItem>
                                <MenuItem value="30">30 minutes before</MenuItem>
                                <MenuItem value="60">1 hour before</MenuItem>
                                <MenuItem value="1440">1 day before</MenuItem>
                            </Select>
                            {reminder && typeof window !== 'undefined' && Notification.permission === 'denied' && (
                                <Box sx={{ color: 'warning.main', fontSize: '0.75rem', mt: 0.5, px: 1 }}>
                                    Notifications blocked. You will receive in-app reminders only.
                                </Box>
                            )}
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={priority}
                                onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                                label="Priority"
                                size="small"
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small" disabled={ongoing || !canBeRecurring}>
                            <InputLabel id="recurrence-label">Recurrence</InputLabel>
                            <Select
                                labelId="recurrence-label"
                                id="recurrence-select"
                                value={ongoing ? '' : recurrence}
                                onChange={e => setRecurrence(e.target.value as typeof recurrence)}
                                label="Recurrence"
                                size="small"
                                disabled={ongoing || !canBeRecurring}
                            >
                                <MenuItem value="">No Repeat</MenuItem>
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="fortnightly">Fortnightly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="quarterly">Quarterly</MenuItem>
                                <MenuItem value="annually">Annually</MenuItem>
                                <MenuItem value="custom">Custom...</MenuItem>
                            </Select>
                            {ongoing && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Ongoing tasks cannot have recurrence
                                </Typography>
                            )}
                            {!canBeRecurring && !ongoing && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Subtasks of regular tasks cannot be recurring
                                </Typography>
                            )}
                        </FormControl>

                        {recurrence === 'custom' && (
                            <Stack direction="row" spacing={2} alignItems="center">
                                <TextField
                                    type="number"
                                    size="small"
                                    label="Repeat every"
                                    value={customIntervalDays}
                                    onChange={e => setCustomIntervalDays(e.target.value ? parseInt(e.target.value) : '')}
                                    inputProps={{ min: 1 }}
                                    fullWidth
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>days</Typography>
                            </Stack>
                        )}

                        {/* Tags Chip Selector */}
                        <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Tags
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                {tags.filter(t => !taskTags.some(tt => tt.id === t.id)).length > 0 && onAddTagToTask && (
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Add tag</InputLabel>
                                        <Select
                                            value=""
                                            onChange={async (e) => {
                                                const tagId = e.target.value
                                                if (tagId) {
                                                    const tagToAdd = tags.find(t => t.id === tagId)
                                                    if (tagToAdd) {
                                                        await onAddTagToTask(task.id, tagId)
                                                        setTaskTags(prev => [...prev, tagToAdd])
                                                    }
                                                }
                                            }}
                                            label="Add tag"
                                            size="small"
                                        >
                                            {tags.filter(t => !taskTags.some(tt => tt.id === t.id)).map(tag => (
                                                <MenuItem key={tag.id} value={tag.id}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: tag.color }} />
                                                        {tag.name}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                                {taskTags.map(tag => (
                                    <Chip
                                        key={tag.id}
                                        label={tag.name}
                                        size="small"
                                        onDelete={onRemoveTagFromTask ? async () => {
                                            await onRemoveTagFromTask(task.id, tag.id)
                                            setTaskTags(prev => prev.filter(t => t.id !== tag.id))
                                        } : undefined}
                                        sx={{
                                            backgroundColor: tag.color,
                                            color: '#fff',
                                            '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' }
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={ongoing}
                                    onChange={e => {
                                        const newValue = e.target.checked
                                        setOngoing(newValue)
                                        if (newValue) {
                                            // Clear recurrence and date when enabling ongoing
                                            setRecurrence('')
                                            setCustomIntervalDays('')
                                            setDueDate(null)
                                            setDueTime(null)
                                        }
                                    }}
                                    disabled={!!recurrence || !canBeOngoing}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: '#f97316',
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: '#f97316',
                                        },
                                    }}
                                />
                            }
                            label={
                                <Box>
                                    <Typography variant="body2">∞ Ongoing task</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {!canBeOngoing ? 'Subtasks cannot be ongoing' : recurrence ? 'Remove recurrence first to make ongoing' : 'Ongoing tasks always appear in your daily view'}
                                    </Typography>
                                </Box>
                            }
                            sx={{ mt: 1, alignItems: 'flex-start' }}
                        />
                    </Stack>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    {/* Only allow adding subtasks if not at max depth */}
                    {(task.depth || 0) < 2 ? (
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                            <TextField
                                value={newChildTask}
                                onChange={e => setNewChildTask(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddChildTask()}
                                placeholder="Add a subtask..."
                                size="small"
                                fullWidth
                            />
                            <Button
                                onClick={handleAddChildTask}
                                disabled={!newChildTask.trim()}
                                variant="contained"
                                sx={{
                                    background: '#f97316 !important',
                                    '&:hover': { background: '#ea580c !important' },
                                    '&.Mui-disabled': { background: 'rgba(255, 255, 255, 0.12) !important' }
                                }}
                            >
                                Add
                            </Button>
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Maximum nesting depth reached (2 levels)
                        </Typography>
                    )}

                    {childTasks.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            <Typography variant="h4">📝</Typography>
                            <Typography variant="body2">No subtasks yet</Typography>
                            <Typography variant="caption">Subtasks can have their own schedule and properties</Typography>
                        </Box>
                    ) : (
                        <List>
                            {childTasks.map(childTask => (
                                <ListItem
                                    key={childTask.id}
                                    dense
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': { backgroundColor: 'action.hover' },
                                        borderRadius: 1
                                    }}
                                >
                                    <ListItemIcon>
                                        <Checkbox
                                            edge="start"
                                            checked={
                                                // For recurring parents, check childTaskCompletions for this instance
                                                // For ongoing/regular parents, use the task's completed field
                                                task.recurrence
                                                    ? childTaskCompletions.some(c => c.child_task_id === childTask.id && c.instance_date === (instanceDate || new Date().toISOString().split('T')[0]))
                                                    : childTask.completed
                                            }
                                            onChange={() => onToggleChildTask(childTask.id, instanceDate || undefined)}
                                            onClick={(e) => e.stopPropagation()}
                                            sx={{ '&.Mui-checked': { color: '#f97316' } }}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        onClick={() => onEditChildTask(childTask)}
                                        primary={childTask.title}
                                        secondary={
                                            // Show task details: recurrence, due date, priority
                                            [
                                                childTask.recurrence && `📅 ${childTask.recurrence}`,
                                                childTask.due_date && `📆 ${new Date(childTask.due_date).toLocaleDateString()}`,
                                                childTask.priority && childTask.priority !== 'medium' && (childTask.priority === 'high' ? '🔥 High' : '💤 Low')
                                            ].filter(Boolean).join(' • ') || undefined
                                        }
                                        sx={{
                                            textDecoration: (task.recurrence
                                                ? childTaskCompletions.some(c => c.child_task_id === childTask.id && c.instance_date === (instanceDate || new Date().toISOString().split('T')[0]))
                                                : childTask.completed) ? 'line-through' : 'none',
                                            color: childTask.completed ? 'text.secondary' : 'text.primary',
                                        }}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() => onDeleteChildTask(childTask.id)}
                                        >
                                            ✕
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <TextField
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                            placeholder="Add a comment..."
                            size="small"
                            fullWidth
                        />
                        <Button
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            variant="contained"
                            sx={{
                                background: '#f97316 !important',
                                '&:hover': { background: '#ea580c !important' },
                                '&.Mui-disabled': { background: 'rgba(255, 255, 255, 0.12) !important' }
                            }}
                        >
                            Add
                        </Button>
                    </Stack>

                    {displayedComments.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            <Typography variant="h4">💬</Typography>
                            <Typography variant="body2">No comments yet</Typography>
                        </Box>
                    ) : (
                        <List>
                            {displayedComments.map(comment => (
                                <ListItem key={comment.id} alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    {editingCommentId === comment.id ? (
                                        // Edit mode
                                        <Stack spacing={1} sx={{ width: '100%' }}>
                                            <TextField
                                                fullWidth
                                                multiline
                                                size="small"
                                                value={editingCommentContent}
                                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                                autoFocus
                                            />
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Button size="small" onClick={cancelEditingComment}>
                                                    Cancel
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={handleUpdateComment}
                                                    disabled={!editingCommentContent.trim()}
                                                    sx={{
                                                        background: '#f97316 !important',
                                                        '&:hover': { background: '#ea580c !important' },
                                                        '&.Mui-disabled': { background: 'rgba(255, 255, 255, 0.12) !important' }
                                                    }}
                                                >
                                                    Save
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    ) : (
                                        // View mode
                                        <Stack direction="row" alignItems="flex-start" sx={{ width: '100%' }}>
                                            <ListItemText
                                                primary={comment.content}
                                                secondary={new Date(comment.created_at).toLocaleDateString()}
                                                sx={{ flex: 1 }}
                                            />
                                            <Stack direction="row" spacing={0.5}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => startEditingComment(comment)}
                                                    title="Edit comment"
                                                >
                                                    ✏️
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onDeleteComment(comment.id)}
                                                    title="Delete comment"
                                                >
                                                    ✕
                                                </IconButton>
                                            </Stack>
                                        </Stack>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    )}
                </TabPanel>
            </DialogContent>

            <DialogActions sx={{
                px: 3,
                pb: 2,
                display: { xs: 'flex', sm: 'flex' },
                justifyContent: { xs: 'stretch', sm: 'space-between' },
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                gap: { xs: 1, sm: 1 },
                alignItems: 'stretch',
                '& > *': {
                    marginLeft: '0 !important'
                }
            }}>
                <Button
                    onClick={() => {
                        confirmDelete(task.title, () => {
                            onDeleteTask(task.id)
                            onClose()
                        })
                    }}
                    color="error"
                    variant="outlined"
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                    Delete
                </Button>
                <Button
                    onClick={onClose}
                    color="inherit"
                    sx={{
                        width: { xs: '100%', sm: 'auto' },
                        order: { xs: 0, sm: 0 }
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving || !title.trim()}
                    variant="contained"
                    sx={{
                        width: { xs: '100%', sm: 'auto' },
                        background: '#f97316 !important',
                        '&:hover': { background: '#ea580c !important' },
                        '&.Mui-disabled': { background: 'rgba(255, 255, 255, 0.12) !important' }
                    }}
                >
                    {saving ? <CircularProgress size={20} /> : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
