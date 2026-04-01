"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useWidgets, WIDGET_META, WidgetType } from "./WidgetContext"
import { WeatherWidget } from "./WeatherWidget"
import { CryptoWidget } from "./CryptoWidget"
import { AnimeWidget } from "./AnimeWidget"
import { FocusTaskWidget } from "./FocusTaskWidget"
import { GoogleSearchWidget } from "./GoogleSearchWidget"
import { ListsWidget } from "./ListsWidget"
import { Task, RecurringTaskCompletion } from "@/app/types"

interface MobileWidgetDrawerProps {
    isDark: boolean
    tasks: Task[]
    recurringCompletions: RecurringTaskCompletion[]
    onToggleTask: (taskId: string, instanceDate?: string) => void
    dayStartHour?: number
}

export function MobileWidgetDrawer({
    isDark,
    tasks,
    recurringCompletions,
    onToggleTask,
    dayStartHour = 6
}: MobileWidgetDrawerProps) {
    const { getWidgetsForPanel } = useWidgets()
    const [isOpen, setIsOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const carouselRef = useRef<HTMLDivElement>(null)
    const drawerRef = useRef<HTMLDivElement>(null)

    // Swipe-down-to-dismiss state
    const [dragY, setDragY] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
    const dragAreaRef = useRef<HTMLDivElement>(null)

    // Combine all active widgets from both panels
    const allWidgets = [...getWidgetsForPanel("left"), ...getWidgetsForPanel("right")]

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY
            document.body.style.position = 'fixed'
            document.body.style.top = `-${scrollY}px`
            document.body.style.left = '0'
            document.body.style.right = '0'
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.position = ''
                document.body.style.top = ''
                document.body.style.left = ''
                document.body.style.right = ''
                document.body.style.overflow = ''
                window.scrollTo(0, scrollY)
            }
        }
    }, [isOpen])

    // Handle carousel scroll to detect active slide
    const handleScroll = useCallback(() => {
        if (!carouselRef.current) return
        const scrollLeft = carouselRef.current.scrollLeft
        const slideWidth = carouselRef.current.clientWidth
        const newIndex = Math.round(scrollLeft / slideWidth)
        setActiveIndex(Math.min(newIndex, allWidgets.length - 1))
    }, [allWidgets.length])

    useEffect(() => {
        const el = carouselRef.current
        if (!el || !isOpen) return
        el.addEventListener('scroll', handleScroll, { passive: true })
        return () => el.removeEventListener('scroll', handleScroll)
    }, [handleScroll, isOpen])

    // Navigate to specific slide
    const goToSlide = (index: number) => {
        if (!carouselRef.current) return
        const slideWidth = carouselRef.current.clientWidth
        carouselRef.current.scrollTo({ left: slideWidth * index, behavior: 'smooth' })
        setActiveIndex(index)
    }

    // Swipe left/right on the carousel area
    const handleCarouselTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        }
    }, [])

    const handleCarouselTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current) return
        const dx = e.changedTouches[0].clientX - touchStartRef.current.x
        const dy = e.changedTouches[0].clientY - touchStartRef.current.y
        const dt = Date.now() - touchStartRef.current.time

        // Only process as swipe if primarily horizontal and fast enough
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50 && dt < 500) {
            if (dx < 0 && activeIndex < allWidgets.length - 1) {
                goToSlide(activeIndex + 1)
            } else if (dx > 0 && activeIndex > 0) {
                goToSlide(activeIndex - 1)
            }
        }
        touchStartRef.current = null
    }, [activeIndex, allWidgets.length])

    // Drag handle: swipe down to dismiss
    const handleDragStart = useCallback((e: React.TouchEvent) => {
        setIsDragging(true)
        touchStartRef.current = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            time: Date.now()
        }
    }, [])

    const handleDragMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || !touchStartRef.current) return
        const dy = e.touches[0].clientY - touchStartRef.current.y
        // Only allow dragging downward
        setDragY(Math.max(0, dy))
    }, [isDragging])

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return
        setIsDragging(false)

        // If dragged more than 100px down, dismiss
        if (dragY > 100) {
            setIsOpen(false)
        }
        setDragY(0)
        touchStartRef.current = null
    }, [isDragging, dragY])

    // Render a widget by type
    const renderWidget = (widgetType: WidgetType) => {
        switch (widgetType) {
            case "weather":
                return <WeatherWidget isDark={isDark} />
            case "crypto":
                return <CryptoWidget isDark={isDark} />
            case "anime":
                return <AnimeWidget isDark={isDark} />
            case "search":
                return <GoogleSearchWidget isDark={isDark} />
            case "lists":
                return <ListsWidget isDark={isDark} />
            case "focus":
                return (
                    <FocusTaskWidget
                        isDark={isDark}
                        tasks={tasks}
                        recurringCompletions={recurringCompletions}
                        onToggleTask={onToggleTask}
                        dayStartHour={dayStartHour}
                    />
                )
            default:
                return null
        }
    }

    if (allWidgets.length === 0) return null

    return (
        <>
            {/* FAB trigger button */}
            <div className="mobile-widget-fab">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`mobile-widget-fab-btn ${isOpen
                        ? 'mobile-widget-fab-btn-open'
                        : isDark ? 'mobile-widget-fab-btn-dark' : 'mobile-widget-fab-btn-light'
                    }`}
                    title="Widgets"
                >
                    {isOpen ? '✕' : '⚡'}
                </button>
            </div>

            {/* Drawer */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="mobile-widget-overlay"
                        onClick={() => setIsOpen(false)}
                        style={{ opacity: dragY > 0 ? Math.max(0.2, 1 - dragY / 300) : 1 }}
                    />

                    {/* Bottom sheet */}
                    <div
                        ref={drawerRef}
                        className={`mobile-widget-drawer ${isDark ? 'mobile-widget-drawer-dark' : 'mobile-widget-drawer-light'}`}
                        style={{
                            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
                            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        {/* Drag handle area - swipe down to dismiss */}
                        <div
                            ref={dragAreaRef}
                            onTouchStart={handleDragStart}
                            onTouchMove={handleDragMove}
                            onTouchEnd={handleDragEnd}
                            style={{ touchAction: 'none', cursor: 'grab', paddingBottom: 4 }}
                        >
                            {/* Handle bar */}
                            <div className={`mobile-widget-drawer-handle ${isDark ? 'mobile-widget-drawer-handle-dark' : 'mobile-widget-drawer-handle-light'}`} />

                            {/* Widget label + counter */}
                            <div style={{ padding: "4px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{
                                    fontSize: 13, fontWeight: 700, letterSpacing: "0.3px",
                                    color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                                }}>
                                    {WIDGET_META[allWidgets[activeIndex]?.type]?.emoji}{' '}
                                    {WIDGET_META[allWidgets[activeIndex]?.type]?.label || 'Widget'}
                                </span>
                                <span style={{
                                    fontSize: 11,
                                    color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                                }}>
                                    {activeIndex + 1} / {allWidgets.length}
                                </span>
                            </div>

                            {/* Dots */}
                            <div className="mobile-widget-dots">
                                {allWidgets.map((w, i) => (
                                    <button
                                        key={w.id}
                                        onClick={() => goToSlide(i)}
                                        className={`mobile-widget-dot ${
                                            i === activeIndex
                                                ? 'mobile-widget-dot-active'
                                                : isDark ? 'mobile-widget-dot-dark' : 'mobile-widget-dot-light'
                                        }`}
                                        title={WIDGET_META[w.type]?.label}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Horizontal carousel - swipe left/right */}
                        <div
                            ref={carouselRef}
                            className="mobile-widget-carousel"
                            onTouchStart={handleCarouselTouchStart}
                            onTouchEnd={handleCarouselTouchEnd}
                        >
                            {allWidgets.map((widget) => (
                                <div key={widget.id} className="mobile-widget-slide">
                                    {renderWidget(widget.type)}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    )
}
