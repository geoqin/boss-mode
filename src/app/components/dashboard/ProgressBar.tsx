"use client"

interface ProgressBarProps {
    completedCount: number
    totalCount: number
    isDark: boolean
}

export function ProgressBar({ completedCount, totalCount, isDark }: ProgressBarProps) {
    // Show even if count is 0? User wants "task count / total". If 0, maybe just "0/0"?
    // Or return null if 0 tasks?
    // "No tasks yet" was in Header. I'll preserve 0/0 or logic.
    // Let's show it if totalCount >= 0, maybe just 0% for 0.

    const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
    const textMuted = isDark ? "text-white/40" : "text-gray-500"

    return (
        <div className="mb-6 animate-fade-in"> {/* Increased mb-2 to mb-6 for breathing room */}
            <div className="flex justify-end mb-1">
                <span className={`text-xs font-mono font-medium ${textMuted}`}>
                    {completedCount} / {totalCount} tasks
                </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div
                    className="h-full transition-all duration-500 ease-out relative"
                    style={{
                        width: `${percentage}%`,
                        background: 'linear-gradient(90deg, #ea580c 0%, #facc15 50%, #22c55e 100%)',
                        backgroundSize: percentage > 0 ? `${(100 / percentage) * 100}% 100%` : '100% 100%'
                    }}
                />
            </div>
        </div>
    )
}
