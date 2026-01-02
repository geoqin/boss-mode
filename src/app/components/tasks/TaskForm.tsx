import { useState, useRef, useEffect } from "react"
import { NewTask, Category } from "@/app/types"
import { getLocalTodayDate } from "@/app/utils/dateUtils"
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
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import {
  CalendarMonth,
  AccessTime,
  NotificationsActive,
  Flag,
  Repeat,
  Label,
} from "@mui/icons-material"
import { DatePicker, TimePicker } from "@mui/x-date-pickers"
import { parse, format, isAfter, addDays, startOfDay } from "date-fns"

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

  const muiTheme = useTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'))

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
          isoDate = combined.toISOString()
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

  // Icon wrapper for mobile
  const FieldIcon = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
    isMobile ? (
      <Tooltip title={label} arrow>
        <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', mr: 0.5 }}>
          {icon}
        </Box>
      </Tooltip>
    ) : null
  )

  return (
    <Paper
      component="form"
      ref={formRef}
      onSubmit={submit}
      elevation={0}
      sx={{
        p: 1,
        bgcolor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'background.paper',
        border: 1,
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'divider',
        borderRadius: 3,
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
          sx={{ minWidth: 80, height: 40 }}
        >
          {isSubmitting ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <>Add →</>
          )}
        </Button>
      </Stack>

      <Collapse in={isExpanded}>
        <Stack
          direction="row"
          flexWrap="wrap"
          gap={isMobile ? 1 : 2}
          sx={{ mt: 2, px: 1 }}
        >
          {/* Due Date */}
          <Stack direction="row" alignItems="center">
            <FieldIcon icon={<CalendarMonth fontSize="small" />} label="Due Date" />
            <DatePicker
              label={isMobile ? "" : "Due Date"}
              value={dueDate}
              onChange={(newValue) => setDueDate(newValue)}
              disabled={isSubmitting}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { minWidth: isMobile ? 100 : 150 },
                  placeholder: isMobile ? "Date" : undefined,
                }
              }}
            />
          </Stack>

          {/* Time */}
          <Stack direction="row" alignItems="center">
            <FieldIcon icon={<AccessTime fontSize="small" />} label="Time" />
            <TimePicker
              label={isMobile ? "" : "Time"}
              value={dueTime}
              onChange={(newValue) => setDueTime(newValue)}
              disabled={isSubmitting}
              slotProps={{
                textField: {
                  size: 'small',
                  sx: { minWidth: isMobile ? 90 : 130 }
                }
              }}
            />
          </Stack>

          {/* Reminder */}
          <Stack direction="row" alignItems="center">
            <FieldIcon icon={<NotificationsActive fontSize="small" />} label="Remind Me" />
            <FormControl size="small" sx={{ minWidth: isMobile ? 80 : 160 }} disabled={!canSetReminder || isSubmitting}>
              {!isMobile && <InputLabel>Remind Me</InputLabel>}
              <Select
                value={reminder}
                onChange={e => setReminder(e.target.value)}
                label={isMobile ? "" : "Remind Me"}
                displayEmpty={isMobile}
              >
                <MenuItem value="">{isMobile ? "—" : "None"}</MenuItem>
                <MenuItem value="15">15m</MenuItem>
                <MenuItem value="30">30m</MenuItem>
                <MenuItem value="60">1h</MenuItem>
                <MenuItem value="1440">1d</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Priority */}
          <Stack direction="row" alignItems="center">
            <FieldIcon icon={<Flag fontSize="small" />} label="Priority" />
            <FormControl size="small" sx={{ minWidth: isMobile ? 70 : 120 }} disabled={isSubmitting}>
              {!isMobile && <InputLabel>Priority</InputLabel>}
              <Select
                value={priority}
                onChange={e => setPriority(e.target.value as "low" | "medium" | "high")}
                label={isMobile ? "" : "Priority"}
              >
                <MenuItem value="low">{isMobile ? "🟢" : "Low"}</MenuItem>
                <MenuItem value="medium">{isMobile ? "🟡" : "Medium"}</MenuItem>
                <MenuItem value="high">{isMobile ? "🔴" : "High"}</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Recurrence */}
          <Stack direction="row" alignItems="center">
            <FieldIcon icon={<Repeat fontSize="small" />} label="Repeat" />
            <FormControl size="small" sx={{ minWidth: isMobile ? 80 : 130 }} disabled={isSubmitting}>
              {!isMobile && <InputLabel>Repeat</InputLabel>}
              <Select
                value={recurrence}
                onChange={e => setRecurrence(e.target.value as "daily" | "weekly" | "monthly" | "")}
                label={isMobile ? "" : "Repeat"}
                displayEmpty={isMobile}
              >
                <MenuItem value="">{isMobile ? "—" : "No Repeat"}</MenuItem>
                <MenuItem value="daily">{isMobile ? "D" : "Daily"}</MenuItem>
                <MenuItem value="weekly">{isMobile ? "W" : "Weekly"}</MenuItem>
                <MenuItem value="monthly">{isMobile ? "M" : "Monthly"}</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Category */}
          <Stack direction="row" alignItems="center">
            <FieldIcon icon={<Label fontSize="small" />} label="Category" />
            <FormControl size="small" sx={{ minWidth: isMobile ? 80 : 130 }} disabled={isSubmitting}>
              {!isMobile && <InputLabel>Category</InputLabel>}
              <Select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                label={isMobile ? "" : "Category"}
                displayEmpty={isMobile}
              >
                <MenuItem value="">{isMobile ? "—" : "No Category"}</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Collapse>
    </Paper>
  )
}
