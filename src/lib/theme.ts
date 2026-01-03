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
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #9f6ff8 0%, #8b5cf6 100%)',
                        boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)',
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
                    backgroundColor: '#1a1625', // Solid neutral color for menus
                    backgroundImage: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                },
            },
        },
        MuiPopover: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#1a1625', // Solid neutral color for popovers (date pickers)
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
            main: '#8b5cf6', // Purple
            light: '#a78bfa',
            dark: '#7c3aed',
        },
        secondary: {
            main: '#ec4899', // Pink
            light: '#f472b6',
            dark: '#db2777',
        },
        background: {
            default: '#0f0a1a',
            paper: '#1a1625', // Changed from rgba to solid
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
            main: '#8b5cf6',
            light: '#a78bfa',
            dark: '#7c3aed',
        },
        secondary: {
            main: '#ec4899',
            light: '#f472b6',
            dark: '#db2777',
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
