"use client"

import { useState } from 'react'
import { Alert } from '@/hooks/useBossReminders'
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack,
    IconButton
} from '@mui/material'
import { NotificationsActive, AccessTime, Close } from '@mui/icons-material'
import { format } from 'date-fns'

interface ReminderManagerProps {
    alerts: Alert[]
    onAcknowledge: (taskId: string) => void
    onSnooze: (taskId: string, minutes: number) => void
}

export function ReminderManager({ alerts, onAcknowledge, onSnooze }: ReminderManagerProps) {
    const [snoozeMinutes, setSnoozeMinutes] = useState(5)

    if (alerts.length === 0) return null

    // Handle one alert at a time (stack them)
    const currentAlert = alerts[0]
    const { task, type } = currentAlert

    const handleSnooze = () => {
        onSnooze(task.id, snoozeMinutes)
    }

    return (
        <Dialog
            open={true}
            maxWidth="xs"
            fullWidth
            onClose={() => handleSnooze()} // Default to snooze if clicked outside? Or explicit ack? 
            // Better to force interaction or default to snooze to be annoying (Boss Mode style)
            // Let's force interaction by getting rid of onClose for now, or defaulting to snooze
            PaperProps={{
                sx: {
                    bgcolor: 'background.paper',
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'primary.main',
                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.25)'
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
                <NotificationsActive color="primary" />
                <Typography variant="h6" component="span" sx={{ flex: 1 }}>
                    {type === 'due' ? 'Task Due!' : 'Reminder'}
                </Typography>
                <IconButton size="small" onClick={() => onAcknowledge(task.id)} sx={{ color: 'text.secondary' }}>
                    <Close fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pb: 1 }}>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1" fontWeight="bold" gutterBottom>
                        {task.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {type === 'due'
                            ? `This task was due at ${task.due_date ? format(new Date(task.due_date), 'h:mm a') : 'now'}.`
                            : `Due in ${task.reminder_minutes_before} minutes.`
                        }
                    </Typography>
                </Box>

                <FormControl fullWidth size="small" variant="outlined" sx={{ mt: 2 }}>
                    <InputLabel>Snooze for...</InputLabel>
                    <Select
                        value={snoozeMinutes}
                        onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
                        label="Snooze for..."
                        startAdornment={<AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                        <MenuItem value={1}>1 minute</MenuItem>
                        <MenuItem value={2}>2 minutes</MenuItem>
                        <MenuItem value={5}>5 minutes</MenuItem>
                        <MenuItem value={10}>10 minutes</MenuItem>
                        <MenuItem value={15}>15 minutes</MenuItem>
                        <MenuItem value={30}>30 minutes</MenuItem>
                        <MenuItem value={60}>1 hour</MenuItem>
                    </Select>
                </FormControl>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 3, pt: 1, flexDirection: 'column', gap: 1 }}>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSnooze}
                    sx={{ borderRadius: 2 }}
                >
                    Snooze
                </Button>
                <Button
                    fullWidth
                    variant="text"
                    color="inherit"
                    onClick={() => onAcknowledge(task.id)}
                    sx={{ borderRadius: 2 }}
                >
                    I&apos;m working on it (Dismiss)
                </Button>
            </DialogActions>
        </Dialog>
    )
}
