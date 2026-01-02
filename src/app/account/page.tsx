"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/components/auth/AuthProvider"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function AccountPage() {
    const { user, loading: authLoading } = useAuth()
    const supabase = useState(() => createClient())[0]
    const router = useRouter()

    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Password State
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [securityMessage, setSecurityMessage] = useState<string | null>(null)
    const [securityError, setSecurityError] = useState<string | null>(null)
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

    useEffect(() => {
        async function fetchProfile() {
            if (!user) return

            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single()

            if (data) {
                setFirstName(data.first_name || "")
                setLastName(data.last_name || "")
                if (data.theme) setTheme(data.theme)
            }
            setIsLoading(false)
        }

        if (!authLoading) {
            if (!user) {
                router.push('/login')
            } else {
                fetchProfile()
            }
        }
    }, [user, authLoading, router, supabase])

    // Apply theme
    useEffect(() => {
        document.documentElement.className = theme
        document.body.className = theme === 'dark' ? 'bg-[#0f0c29] text-white' : 'bg-gray-50 text-gray-900'
    }, [theme])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setIsSaving(true)
        setMessage(null)
        setError(null)

        const { error } = await supabase
            .from('user_preferences')
            .update({
                first_name: firstName,
                last_name: lastName,
            })
            .eq('user_id', user.id)

        if (error) {
            console.error('Error updating profile:', error)
            setError('Failed to update profile')
        } else {
            setMessage('Profile updated successfully!')
            router.refresh()
        }
        setIsSaving(false)
    }

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setSecurityMessage(null)
        setSecurityError(null)

        if (newPassword !== confirmPassword) {
            setSecurityError("Passwords do not match")
            return
        }
        if (newPassword.length < 6) {
            setSecurityError("Password must be at least 6 characters")
            return
        }

        setIsUpdatingPassword(true)
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        })

        if (error) {
            setSecurityError(error.message)
        } else {
            setSecurityMessage("Password updated successfully!")
            setNewPassword("")
            setConfirmPassword("")
        }
        setIsUpdatingPassword(false)
    }

    const handleResetLink = async () => {
        if (!user || !user.email) return
        setSecurityMessage(null)
        setSecurityError(null)
        setIsUpdatingPassword(true)

        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/account/reset-password`,
        })

        if (error) {
            setSecurityError(error.message)
        } else {
            setSecurityMessage("Password reset link sent to your email!")
        }
        setIsUpdatingPassword(false)
    }

    const isDark = theme === 'dark'
    const inputClass = isDark
        ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
        : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500"

    const isSocialLogin = user?.app_metadata?.provider && user.app_metadata.provider !== 'email'

    if (authLoading || isLoading) {
        return <div className="min-h-screen flex items-center justify-center text-white/40">Loading...</div>
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-gradient-hero' : 'bg-gray-50'}`}>
            {/* Decorative orbs */}
            {isDark && (
                <>
                    <div className="fixed top-10 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="fixed bottom-10 right-10 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
                </>
            )}

            <div className="relative z-10 max-w-xl mx-auto px-6 py-12">
                <header className="mb-8 animate-fade-in">
                    <Link href="/dashboard" className="inline-flex items-center text-sm text-white/40 hover:text-white/60 transition-colors mb-4">
                        ← Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'glass' : 'bg-white shadow-sm border border-gray-100'}`}>
                            <span className="text-2xl">⚙️</span>
                        </div>
                        <h1 className={`text-3xl font-bold ${isDark ? 'gradient-text' : 'text-gray-900'}`}>Account Settings</h1>
                    </div>
                </header>

                <div className="space-y-6">
                    {/* Profile Section */}
                    <div className={`${isDark ? 'glass-card' : 'bg-white shadow-xl border border-gray-100'} p-8 rounded-2xl animate-fade-in`}>
                        <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile Details</h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Email (Read Only) */}
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                    Email Address
                                </label>
                                <input
                                    type="text"
                                    value={user?.email || ''}
                                    disabled
                                    className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/5 text-white/40' : 'bg-gray-100 border-gray-200 text-gray-500'} cursor-not-allowed`}
                                />
                            </div>

                            {/* Name Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl border ${inputClass} focus:outline-none transition-all`}
                                        placeholder="Enter first name"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl border ${inputClass} focus:outline-none transition-all`}
                                        placeholder="Enter last name"
                                    />
                                </div>
                            </div>

                            {message && (
                                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm animate-fade-in">
                                    {message}
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in">
                                    {error}
                                </div>
                            )}

                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="btn-primary px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Security Section */}
                    <div className={`${isDark ? 'glass-card' : 'bg-white shadow-xl border border-gray-100'} p-8 rounded-2xl animate-fade-in`}>
                        <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Security</h2>

                        {isSocialLogin ? (
                            <div className="space-y-4">
                                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                    You are logged in via <strong>{user?.app_metadata.provider}</strong>. To change your password, you can request a reset link sent to your email.
                                </p>
                                <button
                                    onClick={handleResetLink}
                                    disabled={isUpdatingPassword}
                                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${isDark ? 'border-purple-500/50 text-purple-300 hover:bg-purple-500/10' : 'border-purple-200 text-purple-700 hover:bg-purple-50'}`}
                                >
                                    {isUpdatingPassword ? 'Sending...' : 'Send Password Reset Link'}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl border ${inputClass} focus:outline-none transition-all`}
                                        placeholder="Minimum 6 characters"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl border ${inputClass} focus:outline-none transition-all`}
                                        placeholder="Re-type new password"
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isUpdatingPassword || !newPassword}
                                        className="btn-primary px-6 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                                    >
                                        {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {securityMessage && (
                            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm animate-fade-in">
                                {securityMessage}
                            </div>
                        )}

                        {securityError && (
                            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fade-in">
                                {securityError}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
