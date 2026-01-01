"use client"

import { useState, useEffect } from 'react'

export function useNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const timer = setTimeout(() => {
                setPermission(Notification.permission)
            }, 0)
            return () => clearTimeout(timer)
        }

        // Register Service Worker
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration)
                    setSwRegistration(registration)
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error)
                })
        }
    }, [])

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            console.error('This browser does not support desktop notification')
            return
        }

        // Check if permission is already granted
        if (permission === 'granted') {
            new Notification('Boss Mode', {
                body: 'Notifications are already enabled! Get to work!',
                icon: '/favicon.svg'
            })
            return
        }

        const result = await Notification.requestPermission()
        setPermission(result)

        if (result === 'granted') {
            new Notification('Boss Mode', {
                body: 'Notifications enabled! The Boss is watching.',
                icon: '/favicon.svg'
            })
        }
    }

    const sendNotification = (title: string, body: string) => {
        if (permission === 'granted') {
            if (swRegistration) {
                swRegistration.showNotification(title, {
                    body: body,
                    icon: '/favicon.svg'
                })
            } else {
                new Notification(title, {
                    body: body,
                    icon: '/favicon.svg'
                })
            }
        }
    }

    const sendTestNotification = () => {
        sendNotification('Boss Mode Test', 'This is a test notification from the Boss.')
    }

    return {
        permission,
        requestPermission,
        sendTestNotification,
        sendNotification
    }
}
