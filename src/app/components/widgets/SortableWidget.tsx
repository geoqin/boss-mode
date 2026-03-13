"use client"

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ReactNode } from 'react'

interface SortableWidgetProps {
    id: string
    children: ReactNode
    isRearrangeMode: boolean
}

export function SortableWidget({ id, children, isRearrangeMode }: SortableWidgetProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id,
        disabled: !isRearrangeMode
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 1000 : 1,
        position: 'relative' as const,
        scale: isDragging ? '1.03' : '1',
        boxShadow: isDragging ? '0 12px 32px rgba(0,0,0,0.4)' : 'none',
        cursor: isRearrangeMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
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
