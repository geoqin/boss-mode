"use client"

import { useState, useEffect, createContext, useContext, ReactNode } from "react"
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControlLabel,
    Checkbox,
} from "@mui/material"

interface DeleteConfirmContextType {
    confirmDelete: (taskName: string, onConfirm: () => void) => void
    skipConfirmation: boolean
    setSkipConfirmation: (skip: boolean) => void
}

const DeleteConfirmContext = createContext<DeleteConfirmContextType | null>(null)

export function useDeleteConfirm() {
    const context = useContext(DeleteConfirmContext)
    if (!context) {
        throw new Error("useDeleteConfirm must be used within DeleteConfirmProvider")
    }
    return context
}

interface DeleteConfirmProviderProps {
    children: ReactNode
}

const STORAGE_KEY = "boss_mode_skip_delete_confirm"

export function DeleteConfirmProvider({ children }: DeleteConfirmProviderProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [taskName, setTaskName] = useState("")
    const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null)
    const [dontAskAgain, setDontAskAgain] = useState(false)
    const [skipConfirmation, setSkipConfirmation] = useState(false)

    // Load preference from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored === "true") {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setSkipConfirmation(true)
            }
        }
    }, [])

    // Save preference to localStorage
    const updateSkipConfirmation = (skip: boolean) => {
        setSkipConfirmation(skip)
        if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, skip ? "true" : "false")
        }
    }

    const confirmDelete = (name: string, onConfirm: () => void) => {
        if (skipConfirmation) {
            // Skip dialog, just delete
            onConfirm()
            return
        }

        setTaskName(name)
        setOnConfirmCallback(() => onConfirm)
        setDontAskAgain(false)
        setIsOpen(true)
    }

    const handleConfirm = () => {
        if (dontAskAgain) {
            updateSkipConfirmation(true)
        }
        if (onConfirmCallback) {
            onConfirmCallback()
        }
        setIsOpen(false)
        setOnConfirmCallback(null)
    }

    const handleCancel = () => {
        setIsOpen(false)
        setOnConfirmCallback(null)
    }

    return (
        <DeleteConfirmContext.Provider
            value={{
                confirmDelete,
                skipConfirmation,
                setSkipConfirmation: updateSkipConfirmation
            }}
        >
            {children}

            <Dialog
                open={isOpen}
                onClose={handleCancel}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                    }
                }}
            >
                <DialogTitle>Delete Task</DialogTitle>
                <DialogContent>
                    <p className="mb-4">
                        Are you sure you want to delete <strong>&quot;{taskName}&quot;</strong>?
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                        This action cannot be undone.
                    </p>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={dontAskAgain}
                                onChange={(e) => setDontAskAgain(e.target.checked)}
                                size="small"
                            />
                        }
                        label={<span className="text-sm">Don&apos;t ask me again</span>}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleCancel} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </DeleteConfirmContext.Provider>
    )
}
