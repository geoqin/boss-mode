"use client"

import { useWidgets } from "./WidgetContext"

interface WidgetRearrangeButtonProps {
    isDark: boolean
}

export function WidgetRearrangeButton({ isDark }: WidgetRearrangeButtonProps) {
    const { isRearrangeMode, toggleRearrangeMode } = useWidgets()

    return (
        <div className="widget-fab-container">
            <button
                onClick={toggleRearrangeMode}
                className={`widget-fab ${isRearrangeMode
                    ? 'widget-fab-active'
                    : isDark ? '' : 'widget-fab-light'
                }`}
                title={isRearrangeMode ? "Done rearranging" : "Rearrange widgets"}
            >
                <span className="widget-fab-icon">
                    {isRearrangeMode ? '✓' : '⚙'}
                </span>
                <span className="widget-fab-label">
                    {isRearrangeMode ? 'Done' : 'Widgets'}
                </span>
            </button>
        </div>
    )
}
