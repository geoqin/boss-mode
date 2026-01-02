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
} from "@mui/material"
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

      // Smart date logic if time is set but date is not
      if (dueTime && !finalDueDate) {
        const today = startOfDay(new Date())
        const now = new Date()

        // If the set time is after current time, use today; otherwise tomorrow
        const setTimeToday = new Date(today)
        setTimeToday.setHours(dueTime.getHours(), dueTime.getMinutes())

        if (isAfter(setTimeToday, now)) {
          finalDueDate = today
        } else {
          finalDueDate = addDays(today, 1)
        }
      }

      // Combine date and time into ISO string
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
          gap={2}
          sx={{ mt: 2, px: 1 }}
        >
          {/* Due Date */}
          <DatePicker
            label="Due Date"
            value={dueDate}
            onChange={(newValue) => setDueDate(newValue)}
            disabled={isSubmitting}
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 150 } }
            }}
          />

          {/* Time */}
          <TimePicker
            label="Time"
            value={dueTime}
            onChange={(newValue) => setDueTime(newValue)}
            disabled={isSubmitting}
            slotProps={{
              textField: { size: 'small', sx: { minWidth: 130 } }
            }}
          />

          {/* Reminder */}
          <FormControl size="small" sx={{ minWidth: 160 }} disabled={!canSetReminder || isSubmitting}>
            <InputLabel>Remind Me</InputLabel>
            <Select
              value={reminder}
              onChange={e => setReminder(e.target.value)}
              label="Remind Me"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="15">15 minutes before</MenuItem>
              <MenuItem value="30">30 minutes before</MenuItem>
              <MenuItem value="60">1 hour before</MenuItem>
              <MenuItem value="1440">1 day before</MenuItem>
            </Select>
          </FormControl>

          {/* Priority */}
          <FormControl size="small" sx={{ minWidth: 120 }} disabled={isSubmitting}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              onChange={e => setPriority(e.target.value as "low" | "medium" | "high")}
              label="Priority"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>

          {/* Recurrence */}
          <FormControl size="small" sx={{ minWidth: 130 }} disabled={isSubmitting}>
            <InputLabel>Repeat</InputLabel>
            <Select
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as "daily" | "weekly" | "monthly" | "")}
              label="Repeat"
            >
              <MenuItem value="">No Repeat</MenuItem>
              <MenuItem value="daily">Daily</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
              <MenuItem value="monthly">Monthly</MenuItem>
            </Select>
          </FormControl>

          {/* Category */}
          <FormControl size="small" sx={{ minWidth: 130 }} disabled={isSubmitting}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              label="Category"
            >
              <MenuItem value="">No Category</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Collapse>
    </Paper>
  )
}
