import { useState, useRef, useEffect } from "react"
import { NewTask, Category } from "@/app/types"
import { getLocalTodayDate, formatLocalDateTime } from "@/app/utils/dateUtils"
import { useMounted } from "@/hooks/useMounted"
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Stack,
  Collapse,
  Paper,
  CircularProgress,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import {
  CalendarMonth,
  AccessTime,
  NotificationsActive,
  PriorityHigh,
  Repeat,
  Label,
} from "@mui/icons-material"
import { DatePicker, TimePicker } from "@mui/x-date-pickers"
import { format, isAfter, addDays, startOfDay } from "date-fns"

interface TaskFormProps {
  onAdd: (task: NewTask) => Promise<void> | void
  categories: Category[]
  theme?: 'light' | 'dark'
}

export function TaskForm({ onAdd, categories, theme = 'dark' }: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [dueTime, setDueTime] = useState<Date | null>(null)
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium")
  const [recurrence, setRecurrence] = useState<"daily" | "weekly" | "monthly" | "">("")
  const [categoryId, setCategoryId] = useState("")
  const [reminder, setReminder] = useState<string>("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const mounted = useMounted()
  const muiTheme = useTheme()
  const isSmallScreen = useMediaQuery(muiTheme.breakpoints.down('sm'))
  const isMobile = mounted && isSmallScreen

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

  // Request notification permission when reminder is selected
  useEffect(() => {
    if (reminder && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [reminder])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      let finalDueDate = dueDate

      if (dueTime && !finalDueDate) {
        const today = startOfDay(new Date())
        const now = new Date()
        const setTimeToday = new Date(today)
        setTimeToday.setHours(dueTime.getHours(), dueTime.getMinutes())

        if (isAfter(setTimeToday, now)) {
          finalDueDate = today
        } else {
          finalDueDate = addDays(today, 1)
        }
      }

      let isoDate: string | null = null
      if (finalDueDate) {
        if (dueTime) {
          const combined = new Date(finalDueDate)
          combined.setHours(dueTime.getHours(), dueTime.getMinutes(), 0)
          isoDate = formatLocalDateTime(combined)
        } else {
          isoDate = format(finalDueDate, 'yyyy-MM-dd')
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
      setDueDate(null)
      setDueTime(null)
      setPriority("medium")
      setRecurrence("")
      setCategoryId("")
      setReminder("")
      setIsExpanded(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSetReminder = !!dueTime

  // Icon for mobile fields
  const FieldIcon = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
    <Tooltip title={label} arrow>
      <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', mr: 0.5 }}>
        {icon}
      </Box>
    </Tooltip>
  )

  return (
    <Box
      component="form"
      ref={formRef}
      onSubmit={submit}
      sx={{
        p: theme === 'dark' ? '2px' : 0,
        borderRadius: '16px', // Matches Outer Radius
        background: theme === 'dark' ? 'linear-gradient(135deg, #f97316, #facc15)' : 'none',
        position: 'relative',
        transition: 'all 0.3s ease',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 1,
          // Composite: Tint over Neutral Dark Gray (instead of Page Color) to avoid purple cast
          background: theme === 'dark'
            ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05)), #1f1f1f'
            : 'background.paper',
          border: theme === 'dark' ? 'none' : 1,
          borderColor: 'divider',
          borderRadius: theme === 'dark' ? '14px' : 3, // 16px - 2px padding = 14px
          height: '100%',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            placeholder="What needs to be done?"
            disabled={isSubmitting}
            fullWidth
            size="small"
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: { px: 1.5, py: 1 }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !title.trim()}
            sx={{
              minWidth: 90,
              height: 40,
              whiteSpace: 'nowrap',
              borderRadius: '20px',
              background: '#f97316 !important', // Force orange
              color: 'white',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                background: '#ea580c !important',
                boxShadow: '0 6px 16px rgba(249, 115, 22, 0.4)',
              },
              '&:disabled': {
                background: theme === 'dark'
                  ? 'rgba(255,255,255,0.1) !important'
                  : 'rgba(0,0,0,0.08) !important',
                color: theme === 'dark'
                  ? 'rgba(255,255,255,0.3)'
                  : 'rgba(0,0,0,0.35)',
                boxShadow: 'none'
              }
            }}
          >
            {isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Add →'
            )}
          </Button>
        </Stack>

        <Collapse in={isExpanded}>
          <Box sx={{ mt: 2, px: 1 }}>
            {isMobile ? (
              // Mobile: Stacked rows
              <Stack spacing={1.5}>
                {/* Row 1: Due Date (full width) */}
                <Stack direction="row" alignItems="center">
                  <FieldIcon icon={<CalendarMonth fontSize="small" />} label="Due Date" />
                  <DatePicker
                    value={dueDate}
                    onChange={setDueDate}
                    disabled={isSubmitting}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Stack>

                {/* Row 2: Time (full width) */}
                <Stack direction="row" alignItems="center">
                  <FieldIcon icon={<AccessTime fontSize="small" />} label="Time" />
                  <TimePicker
                    value={dueTime}
                    onChange={setDueTime}
                    disabled={isSubmitting}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Stack>

                {/* Row 3: Reminder + Priority */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <FieldIcon icon={<NotificationsActive fontSize="small" />} label="Remind" />
                  <FormControl size="small" sx={{ flex: 1 }} disabled={!canSetReminder || isSubmitting}>
                    <Select value={reminder} onChange={e => setReminder(e.target.value)} displayEmpty>
                      <MenuItem value="">—</MenuItem>
                      <MenuItem value="15">15m</MenuItem>
                      <MenuItem value="30">30m</MenuItem>
                      <MenuItem value="60">1h</MenuItem>
                      <MenuItem value="1440">1d</MenuItem>
                    </Select>
                    {reminder && typeof window !== 'undefined' && Notification.permission === 'denied' && (
                      <Box sx={{ color: 'warning.main', fontSize: '0.7rem', mt: 0.5, px: 0.5 }}>
                        Notifications blocked. In-app only.
                      </Box>
                    )}
                  </FormControl>
                  <FieldIcon icon={<PriorityHigh fontSize="small" />} label="Priority" />
                  <FormControl size="small" sx={{ flex: 1 }} disabled={isSubmitting}>
                    <Select value={priority} onChange={e => setPriority(e.target.value as "low" | "medium" | "high")}>
                      <MenuItem value="low">🟢</MenuItem>
                      <MenuItem value="medium">🟡</MenuItem>
                      <MenuItem value="high">🔴</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                {/* Row 4: Category + Repeat */}
                <Stack direction="row" spacing={1} alignItems="center">
                  <FieldIcon icon={<Label fontSize="small" />} label="Category" />
                  <FormControl size="small" sx={{ flex: 1 }} disabled={isSubmitting}>
                    <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} displayEmpty>
                      <MenuItem value="">—</MenuItem>
                      {categories.map(cat => (
                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FieldIcon icon={<Repeat fontSize="small" />} label="Repeat" />
                  <FormControl size="small" sx={{ flex: 1 }} disabled={isSubmitting}>
                    <Select value={recurrence} onChange={e => setRecurrence(e.target.value as "daily" | "weekly" | "monthly" | "")} displayEmpty>
                      <MenuItem value="">—</MenuItem>
                      <MenuItem value="daily">D</MenuItem>
                      <MenuItem value="weekly">W</MenuItem>
                      <MenuItem value="monthly">M</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            ) : (
              // Desktop: Organized rows with proper sizing
              <Stack spacing={2}>
                {/* Row 1: Due Date + Time */}
                <Stack direction="row" spacing={2}>
                  <DatePicker
                    label="Due Date"
                    value={dueDate}
                    onChange={setDueDate}
                    disabled={isSubmitting}
                    slotProps={{ textField: { size: 'small', sx: { flex: 1 } } }}
                  />
                  <TimePicker
                    label="Time"
                    value={dueTime}
                    onChange={setDueTime}
                    disabled={isSubmitting}
                    slotProps={{ textField: { size: 'small', sx: { flex: 1 } } }}
                  />
                </Stack>

                {/* Row 2: Reminder (wider) + Priority (narrower) */}
                <Stack direction="row" spacing={2}>
                  <FormControl size="small" sx={{ flex: 2 }} disabled={!canSetReminder || isSubmitting}>
                    <InputLabel>Remind Me</InputLabel>
                    <Select value={reminder} onChange={e => setReminder(e.target.value)} label="Remind Me">
                      <MenuItem value="">None</MenuItem>
                      <MenuItem value="15">15 minutes before</MenuItem>
                      <MenuItem value="30">30 minutes before</MenuItem>
                      <MenuItem value="60">1 hour before</MenuItem>
                      <MenuItem value="1440">1 day before</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: 1 }} disabled={isSubmitting}>
                    <InputLabel>Priority</InputLabel>
                    <Select value={priority} onChange={e => setPriority(e.target.value as "low" | "medium" | "high")} label="Priority">
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                {/* Row 3: Repeat (narrower) + Category (wider) */}
                <Stack direction="row" spacing={2}>
                  <FormControl size="small" sx={{ flex: 1 }} disabled={isSubmitting}>
                    <InputLabel>Repeat</InputLabel>
                    <Select value={recurrence} onChange={e => setRecurrence(e.target.value as "daily" | "weekly" | "monthly" | "")} label="Repeat">
                      <MenuItem value="">No Repeat</MenuItem>
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: 2 }} disabled={isSubmitting}>
                    <InputLabel>Category</InputLabel>
                    <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} label="Category">
                      <MenuItem value="">No Category</MenuItem>
                      {categories.map(cat => (
                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  )
}
