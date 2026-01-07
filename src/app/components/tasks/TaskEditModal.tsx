"use client"

import { useState, useEffect } from "react"
import { Task, Subtask, Comment, Category } from "@/app/types"
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
    Typography,
    Divider,
    CircularProgress,
} from "@mui/material"
import { DatePicker, TimePicker } from "@mui/x-date-pickers"
import { parse, format } from "date-fns"
import { useDeleteConfirm } from "@/app/components/DeleteConfirmProvider"

interface TaskEditModalProps {
    task: Task
    subtasks: Subtask[]
    comments: Comment[]
    categories: Category[]
    isDark: boolean
    instanceDate?: string | null
    onClose: () => void
    onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>
    onDeleteTask: (taskId: string) => Promise<void>
    onAddSubtask: (taskId: string, title: string) => Promise<void>
    onToggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>
    onDeleteSubtask: (subtaskId: string) => Promise<void>
    onAddComment: (taskId: string, content: string, instanceDate?: string | null) => Promise<void>
    onDeleteComment: (commentId: string) => Promise<void>
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
    subtasks,
    comments,
    categories,
    isDark,
    instanceDate,
    onClose,
    onUpdateTask,
    onDeleteTask,
    onAddSubtask,
    onToggleSubtask,
    onDeleteSubtask,
    onAddComment,
    onDeleteComment,
}: TaskEditModalProps) {
    const { confirmDelete } = useDeleteConfirm()
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
    const [recurrence, setRecurrence] = useState(task.recurrence || '')
    const [categoryId, setCategoryId] = useState(task.category_id || '')
    const [reminder, setReminder] = useState<string>(task.reminder_minutes_before?.toString() || '')

    const [newSubtask, setNewSubtask] = useState('')
    const [newComment, setNewComment] = useState('')
    const [saving, setSaving] = useState(false)
    const [tabValue, setTabValue] = useState(0)

    const displayedComments = comments.filter(c => {
        if (!task.recurrence) return true
        if (instanceDate) return c.instance_date === instanceDate
        return !c.instance_date
    })

    const handleSave = async () => {
        setSaving(true)
        try {
            let isoDate: string | null = null
            if (dueDate) {
                if (dueTime) {
                    const combined = new Date(dueDate)
                    combined.setHours(dueTime.getHours(), dueTime.getMinutes(), 0)
                    isoDate = combined.toISOString()
                } else {
                    isoDate = format(dueDate, 'yyyy-MM-dd')
                }
            }

            await onUpdateTask({
                id: task.id,
                title,
                due_date: isoDate,
                priority,
                recurrence: (recurrence || null) as 'daily' | 'weekly' | 'monthly' | null,
                category_id: categoryId || null,
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

    const handleAddComment = async () => {
        if (!newComment.trim()) return
        await onAddComment(task.id, newComment.trim(), instanceDate)
        setNewComment('')
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
                    sx={{
                        '& .MuiTabs-indicator': { backgroundColor: '#f97316 !important' },
                        '& .Mui-selected': { color: '#f97316 !important' }
                    }}
                >
                    <Tab label="Details" />
                    <Tab label={`Subtasks (${subtasks.length})`} />
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
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                            <TimePicker
                                label="Time"
                                value={dueTime}
                                onChange={setDueTime}
                                slotProps={{ textField: { fullWidth: true } }}
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

                        <FormControl fullWidth size="small">
                            <InputLabel id="recurrence-label">Recurrence</InputLabel>
                            <Select
                                labelId="recurrence-label"
                                id="recurrence-select"
                                value={recurrence}
                                onChange={e => setRecurrence(e.target.value)}
                                label="Recurrence"
                                size="small"
                            >
                                <MenuItem value="">No Repeat</MenuItem>
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={categoryId}
                                onChange={e => setCategoryId(e.target.value)}
                                label="Category"
                                size="small"
                            >
                                <MenuItem value="">No Category</MenuItem>
                                {categories.map(cat => (
                                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Stack>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <TextField
                            value={newSubtask}
                            onChange={e => setNewSubtask(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                            placeholder="Add a subtask..."
                            size="small"
                            fullWidth
                        />
                        <Button
                            onClick={handleAddSubtask}
                            disabled={!newSubtask.trim()}
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

                    {subtasks.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                            <Typography variant="h4">📝</Typography>
                            <Typography variant="body2">No subtasks yet</Typography>
                        </Box>
                    ) : (
                        <List>
                            {subtasks.map(subtask => (
                                <ListItem key={subtask.id} dense>
                                    <ListItemIcon>
                                        <Checkbox
                                            edge="start"
                                            checked={subtask.completed}
                                            onChange={() => onToggleSubtask(subtask.id, !subtask.completed)}
                                            sx={{ '&.Mui-checked': { color: '#f97316' } }}
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={subtask.title}
                                        sx={{
                                            textDecoration: subtask.completed ? 'line-through' : 'none',
                                            color: subtask.completed ? 'text.secondary' : 'text.primary',
                                        }}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() => onDeleteSubtask(subtask.id)}
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
                                <ListItem key={comment.id} alignItems="flex-start">
                                    <ListItemText
                                        primary={comment.content}
                                        secondary={new Date(comment.created_at).toLocaleDateString()}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            onClick={() => onDeleteComment(comment.id)}
                                        >
                                            ✕
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </TabPanel>
            </DialogContent>

            <DialogActions sx={{
                px: 3,
                pb: 2,
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: { xs: 'column-reverse', sm: 'row' },
                gap: { xs: 1.5, sm: 0 },
                alignItems: 'stretch'
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
                <Box sx={{
                    display: 'flex',
                    gap: 1,
                    width: { xs: '100%', sm: 'auto' },
                    flexDirection: { xs: 'column-reverse', sm: 'row' }
                }}>
                    <Button
                        onClick={onClose}
                        color="inherit"
                        sx={{ width: { xs: '100%', sm: 'auto' } }}
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
                </Box>
            </DialogActions>
        </Dialog>
    )
}
