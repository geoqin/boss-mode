"use client"

import React, { Component, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6">
                    <div className="glass-card p-8 max-w-md text-center animate-fade-in">
                        <div className="text-6xl mb-4">😵</div>
                        <h2 className="text-2xl font-bold gradient-text mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-white/60 mb-6">
                            The Boss encountered an unexpected error. Don&apos;t worry, your data is safe.
                        </p>
                        {this.state.error && (
                            <details className="text-left mb-6">
                                <summary className="text-white/40 text-sm cursor-pointer hover:text-white/60">
                                    Technical details
                                </summary>
                                <pre className="mt-2 p-3 bg-white/5 rounded-lg text-xs text-red-400 overflow-auto max-h-32">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReset}
                                className="btn-primary !py-2 !px-4 text-sm"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 text-sm text-white/60 hover:text-white/80 transition-colors"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
