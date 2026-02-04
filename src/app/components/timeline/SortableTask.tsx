"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactNode } from 'react'

interface SortableTaskProps {
    id: string
    children: ReactNode
    isSelected?: boolean
    isRearrangeMode?: boolean
    disabled?: boolean
}

export function SortableTask({
    id,
    children,
    isSelected = false,
    isRearrangeMode = false,
    disabled = false
}: SortableTaskProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id,
        disabled: !isRearrangeMode || disabled
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1000 : 1,
        position: 'relative' as const,
        // Orange outline when selected for click-to-swap
        outline: isSelected ? '2px solid rgba(249, 115, 22, 0.6)' : 'none',
        outlineOffset: '2px',
        // Scale up slightly when dragging
        scale: isDragging ? '1.02' : '1',
        // Drop shadow when dragging
        boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
        borderRadius: '8px',
        // Cursor changes in rearrange mode
        cursor: isRearrangeMode ? (isDragging ? 'grabbing' : 'grab') : 'default'
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(isRearrangeMode ? { ...attributes, ...listeners } : {})}
        >
            {children}
        </div>
    )
}
