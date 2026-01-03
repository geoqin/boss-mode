'use client'

import { ReactNode, createContext, useContext, useMemo, useState, useEffect } from 'react'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { darkTheme, lightTheme } from '@/lib/theme'

interface ThemeContextType {
    mode: 'light' | 'dark'
    toggleTheme: () => void
    setMode: (mode: 'light' | 'dark') => void
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'dark',
    toggleTheme: () => { },
    setMode: () => { },
})

export const useTheme = () => useContext(ThemeContext)

interface MuiProviderProps {
    children: ReactNode
}

export function MuiProvider({ children }: MuiProviderProps) {
    const [mode, setMode] = useState<'light' | 'dark'>('dark')

    const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode])

    const toggleTheme = () => {
        setMode(prev => (prev === 'dark' ? 'light' : 'dark'))
    }

    const contextValue = useMemo(
        () => ({ mode, toggleTheme, setMode }),
        [mode]
    )

    return (
        <ThemeContext.Provider value={contextValue}>
            <AppRouterCacheProvider>
                <MuiThemeProvider theme={theme}>
                    <CssBaseline />
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        {children}
                    </LocalizationProvider>
                </MuiThemeProvider>
            </AppRouterCacheProvider>
        </ThemeContext.Provider>
    )
}
