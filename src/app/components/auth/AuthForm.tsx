"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
    TextField,
    Button,
    Stack,
    Divider,
    Typography,
    Alert,
    CircularProgress,
    Box,
} from '@mui/material'
import { GoogleIcon } from './GoogleIcon'

type AuthMode = 'login' | 'signup' | 'forgot_password'

export function AuthForm() {
    const [mode, setMode] = useState<AuthMode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const router = useRouter()
    const supabase = useState(() => createClient())[0]

    const handleOAuthLogin = async (provider: 'google' | 'github') => {
        setLoading(true)
        setError(null)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })
            if (error) throw error
        } catch (err) {
            console.error('OAuth error:', err)
            setError(err instanceof Error ? err.message : 'Failed to initiate login')
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setMessage(null)

        try {
            if (mode === 'forgot_password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/account/reset-password`,
                })
                if (error) throw error
                setMessage('Check your email for the password reset link.')

            } else if (mode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                        data: {
                            first_name: firstName,
                            last_name: lastName
                        }
                    },
                })
                if (error) throw error

                if (data.user) {
                    await supabase.from('user_preferences').upsert({
                        user_id: data.user.id,
                        first_name: firstName,
                        last_name: lastName,
                        theme: 'dark',
                        notifications_enabled: false
                    })
                }

                setMessage('Check your email for the confirmation link!')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err) {
            console.error('Auth handler error:', err)
            const message = err instanceof Error ? err.message : 'An error occurred'
            setError(`Auth Error: ${message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box sx={{ width: '100%', maxWidth: 400 }}>
            <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                    {mode === 'signup' && (
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                fullWidth
                                placeholder="Boss"
                            />
                            <TextField
                                label="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                fullWidth
                                placeholder="Mode"
                            />
                        </Stack>
                    )}

                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        fullWidth
                        placeholder="you@example.com"
                    />

                    {mode !== 'forgot_password' && (
                        <Box>
                            <TextField
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                fullWidth
                                placeholder="••••••••"
                                inputProps={{ minLength: 6 }}
                            />
                            {mode === 'login' && (
                                <Button
                                    size="small"
                                    onClick={() => {
                                        setMode('forgot_password')
                                        setError(null)
                                        setMessage(null)
                                    }}
                                    sx={{ mt: 0.5, textTransform: 'none' }}
                                >
                                    Forgot password?
                                </Button>
                            )}
                        </Box>
                    )}

                    {error && <Alert severity="error">{error}</Alert>}
                    {message && <Alert severity="success">{message}</Alert>}

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        fullWidth
                        size="large"
                    >
                        {loading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : mode === 'login' ? (
                            'Sign In'
                        ) : mode === 'signup' ? (
                            'Sign Up'
                        ) : (
                            'Send Reset Link'
                        )}
                    </Button>
                </Stack>
            </form>

            <Box sx={{ mt: 3 }}>
                {mode === 'forgot_password' ? (
                    <Button
                        onClick={() => {
                            setMode('login')
                            setError(null)
                            setMessage(null)
                        }}
                        fullWidth
                        sx={{ textTransform: 'none' }}
                    >
                        ← Back to Sign In
                    </Button>
                ) : (
                    <>
                        {/* Signup/Login toggle - moved above OAuth for visibility */}
                        <Button
                            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                            fullWidth
                            variant="outlined"
                            sx={{ textTransform: 'none' }}
                        >
                            {mode === 'login'
                                ? "Don't have an account? Sign up"
                                : 'Already have an account? Sign in'}
                        </Button>

                        <Divider sx={{ my: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                Or continue with
                            </Typography>
                        </Divider>

                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="outlined"
                                onClick={() => handleOAuthLogin('google')}
                                disabled={loading}
                                fullWidth
                                startIcon={<GoogleIcon className="w-5 h-5" />}
                            >
                                Google
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => handleOAuthLogin('github')}
                                disabled={loading}
                                fullWidth
                                startIcon={
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                    </svg>
                                }
                            >
                                GitHub
                            </Button>
                        </Stack>
                    </>
                )}
            </Box>
        </Box>
    )
}
