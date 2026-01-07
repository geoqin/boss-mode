'use client'

import { createTheme, ThemeOptions } from '@mui/material/styles'

// Custom palette matching Boss Mode aesthetics
const baseTheme: ThemeOptions = {
    typography: {
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        button: {
            textTransform: 'none', // No uppercase buttons
            fontWeight: 600,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: '10px 24px',
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    boxShadow: '0 4px 15px rgba(249, 115, 22, 0.3)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
                        boxShadow: '0 8px 25px rgba(249, 115, 22, 0.4)',
                    },
                },
            },
        },
        MuiTextField: {
            defaultProps: {
                size: 'small',
                variant: 'outlined',
            },
        },
        MuiSelect: {
            defaultProps: {
                size: 'small',
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#27272a', // Warm charcoal for menus
                    backgroundImage: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                },
            },
        },
        MuiPopover: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#27272a', // Warm charcoal for popovers (date pickers)
                    backgroundImage: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                },
            },
        },
    },
}

export const darkTheme = createTheme({
    ...baseTheme,
    palette: {
        mode: 'dark',
        primary: {
            main: '#f97316', // Orange
            light: '#fb923c',
            dark: '#ea580c',
        },
        secondary: {
            main: '#facc15', // Yellow/Gold
            light: '#fde047',
            dark: '#eab308',
        },
        background: {
            default: '#18181b', // Warm charcoal
            paper: '#27272a', // Slightly lighter charcoal
        },
        text: {
            primary: '#f5f5f7',
            secondary: 'rgba(255, 255, 255, 0.6)',
        },
        error: {
            main: '#ef4444',
        },
        warning: {
            main: '#f59e0b',
        },
        success: {
            main: '#10b981',
        },
    },
})

export const lightTheme = createTheme({
    ...baseTheme,
    palette: {
        mode: 'light',
        primary: {
            main: '#f97316', // Orange
            light: '#fb923c',
            dark: '#ea580c',
        },
        secondary: {
            main: '#facc15', // Yellow/Gold
            light: '#fde047',
            dark: '#eab308',
        },
        background: {
            default: '#f9fafb',
            paper: '#ffffff',
        },
        text: {
            primary: '#111827',
            secondary: '#6b7280',
        },
        error: {
            main: '#ef4444',
        },
        warning: {
            main: '#f59e0b',
        },
        success: {
            main: '#10b981',
        },
    },
})
