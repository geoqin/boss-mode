"use client"

import { useRef, useEffect, useCallback } from "react"

interface SwipeHandlers {
    onSwipeLeft?: () => void
    onSwipeRight?: () => void
}

/**
 * Hook to detect swipe gestures on touch devices
 * @param handlers - Callbacks for swipe left/right
 * @param threshold - Minimum swipe distance in pixels (default 50)
 * @returns ref to attach to the swipeable element
 */
export function useSwipeGesture<T extends HTMLElement>(
    handlers: SwipeHandlers,
    threshold: number = 50
) {
    const ref = useRef<T>(null)
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)

    const handleTouchStart = useCallback((e: TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
    }, [])

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null) return

        const touchEndX = e.changedTouches[0].clientX
        const touchEndY = e.changedTouches[0].clientY

        const deltaX = touchEndX - touchStartX.current
        const deltaY = touchEndY - touchStartY.current

        // Only trigger if horizontal swipe is greater than vertical
        // This prevents accidental swipes while scrolling
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
            if (deltaX > 0 && handlers.onSwipeRight) {
                handlers.onSwipeRight()
            } else if (deltaX < 0 && handlers.onSwipeLeft) {
                handlers.onSwipeLeft()
            }
        }

        touchStartX.current = null
        touchStartY.current = null
    }, [handlers, threshold])

    useEffect(() => {
        const element = ref.current
        if (!element) return

        element.addEventListener('touchstart', handleTouchStart, { passive: true })
        element.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            element.removeEventListener('touchstart', handleTouchStart)
            element.removeEventListener('touchend', handleTouchEnd)
        }
    }, [handleTouchStart, handleTouchEnd])

    return ref
}
