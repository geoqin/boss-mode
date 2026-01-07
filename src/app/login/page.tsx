import { AuthForm } from '@/app/components/auth/AuthForm'
import Link from 'next/link'
import { BossFace } from '@/app/components/boss/BossFace'

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-6 py-12">
            {/* Decorative orbs */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 text-center animate-fade-in">
                {/* Logo */}
                <Link href="/" className="inline-block w-16 h-16 mb-8 hover:scale-105 transition-transform duration-300">
                    <BossFace tasks={[]} className="w-full h-full" />
                </Link>

                <h1 className="text-3xl font-bold gradient-text mb-2">Welcome Back</h1>
                <p className="text-white/50 mb-8">Sign in to continue to Boss Mode</p>

                {/* Auth Form */}
                <div className="glass-card p-8">
                    <AuthForm />
                </div>

                <Link href="/" className="inline-block mt-6 text-white/40 hover:text-white/60 text-sm transition-colors">
                    ← Back to home
                </Link>
            </div>
        </div>
    )
}
