import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BossFace } from "@/app/components/boss/BossFace"

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-6 py-12">
      {/* Decorative orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl animate-fade-in">
        {/* Logo / Icon */}
        <div className="mb-8 w-20 h-20 animate-float mx-auto inline-flex">
          <BossFace tasks={[]} className="w-full h-full" />
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          <span className="gradient-text">Boss Mode</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-white/60 mb-4 font-light">
          Your personal accountability system
        </p>

        {/* Description */}
        <p className="text-base text-white/40 mb-10 max-w-md mx-auto">
          Stay on track with stern motivation. Add tasks, get things done,
          and receive no-nonsense feedback when you slack off.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login" className="btn-primary inline-block text-lg">
            Get Started →
          </Link>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          <div className="glass-card p-4">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-sm text-white/60">Track Tasks</p>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl mb-2">😤</div>
            <p className="text-sm text-white/60">Get Motivated</p>
          </div>
          <div className="glass-card p-4">
            <div className="text-2xl mb-2">🚀</div>
            <p className="text-sm text-white/60">Ship Faster</p>
          </div>
        </div>
      </div>
    </main>
  )
}
