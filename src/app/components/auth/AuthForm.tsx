"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
                if (error) {
                    console.error('Signup error:', error)
                    throw error
                }

                // Also insert into user_preferences for easier querying
                if (data.user) {
                    await supabase.from('user_preferences').upsert({
                        user_id: data.user.id,
                        first_name: firstName,
                        last_name: lastName,
                        theme: 'dark', // default
                        notifications_enabled: false
                    })
                }

                setMessage('Check your email for the confirmation link!')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) {
                    console.error('Login error:', error)
                    throw error
                }
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
        <div className="w-full max-w-md">
            <div className="mb-6 flex justify-center">
                {/* Optional: Add title changes based on mode if desired, but parent handles title */}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label htmlFor="firstName" className="block text-sm font-medium text-white/70 mb-2">
                                First Name
                            </label>
                            <input
                                id="firstName"
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                className="input-modern w-full"
                                placeholder="Boss"
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="lastName" className="block text-sm font-medium text-white/70 mb-2">
                                Last Name
                            </label>
                            <input
                                id="lastName"
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                className="input-modern w-full"
                                placeholder="Mode"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="input-modern w-full"
                        placeholder="you@example.com"
                    />
                </div>

                {mode !== 'forgot_password' && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="password" className="block text-sm font-medium text-white/70">
                                Password
                            </label>
                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('forgot_password')
                                        setError(null)
                                        setMessage(null)
                                    }}
                                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    Forgot password?
                                </button>
                            )}
                        </div>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="input-modern w-full"
                            placeholder="••••••••"
                        />
                    </div>
                )}

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm animate-fade-in">
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' :
                        mode === 'login' ? 'Sign In' :
                            mode === 'signup' ? 'Sign Up' :
                                'Send Reset Link'}
                </button>
            </form>

            <div className="mt-6">
                {mode === 'forgot_password' ? (
                    <button
                        type="button"
                        onClick={() => {
                            setMode('login')
                            setError(null)
                            setMessage(null)
                        }}
                        className="w-full text-center text-white/50 hover:text-white/70 text-sm transition-colors"
                    >
                        ← Back to Sign In
                    </button>
                ) : (
                    <>
                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[#0f0c29] text-white/40">Or continue with</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleOAuthLogin('google')}
                                className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-white/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <GoogleIcon className="w-5 h-5" />
                                Google
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleOAuthLogin('github')}
                                className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-white/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                </svg>
                                GitHub
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                className="text-white/50 hover:text-white/70 text-sm transition-colors"
                            >
                                {mode === 'login'
                                    ? "Don't have an account? Sign up"
                                    : 'Already have an account? Sign in'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
