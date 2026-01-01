"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type AuthMode = 'login' | 'signup'

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
            if (mode === 'signup') {
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

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
                        Password
                    </label>
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

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                        {message}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
            </form>

            <div className="mt-6">
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-[#0f0c29] text-white/40">Or continue with</span>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleOAuthLogin('github')}
                        className="flex items-center justify-center w-full px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-white/80 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        GitHub
                    </button>
                </div>
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
        </div>
    )
}
