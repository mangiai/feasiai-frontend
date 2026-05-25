'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon, RotateCcwIcon } from 'lucide-react'

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

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div role="alert" className="empty-state py-16 animate-fade-in">
          <AlertCircleIcon className="w-12 h-12 text-destructive" />
          <p className="empty-state__title">Something went wrong</p>
          <p className="empty-state__description">
            {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RotateCcwIcon className="w-3.5 h-3.5 mr-1.5" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
