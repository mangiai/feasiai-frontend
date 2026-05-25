import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

function renderStructuredContent(obj: Record<string, unknown>, depth = 0): React.ReactNode {
  return Object.entries(obj).map(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return (
        <section key={key} className={depth === 0 ? 'mb-6' : 'ml-4 mb-3'}>
          <h3 className="font-semibold text-foreground mb-1">{label}</h3>
          {renderStructuredContent(value as Record<string, unknown>, depth + 1)}
        </section>
      )
    }
    if (Array.isArray(value)) {
      return (
        <div key={key} className={depth === 0 ? 'mb-4' : 'ml-4 mb-2'}>
          <h4 className="font-medium text-foreground mb-1">{label}</h4>
          <ul className="list-disc ml-5 space-y-1">
            {value.map((item, i) => (
              <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</li>
            ))}
          </ul>
        </div>
      )
    }
    return (
      <p key={key} className={depth === 0 ? 'mb-2' : 'ml-4 mb-1'}>
        <span className="font-medium text-foreground">{label}:</span>{' '}
        <span className="text-muted-foreground">{String(value)}</span>
      </p>
    )
  })
}

interface SharedReportPageProps {
  params: Promise<{ token: string }>
}

export default async function SharedReportPage({ params }: SharedReportPageProps) {
  const { token } = await params
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from('reports')
    .select('id, title, content, status, verification_status, current_version, created_at, updated_at')
    .eq('public_token', token)
    .single()

  if (error || !report) {
    notFound()
  }

  const contentDisplay = typeof report.content === 'string'
    ? report.content
    : typeof report.content === 'object' && report.content !== null
      ? renderStructuredContent(report.content as Record<string, unknown>)
      : 'No content'

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {report.title}
          </h1>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {report.status.replace(/_/g, ' ')}
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {report.verification_status}
            </span>
            <span>v{report.current_version}</span>
            <span>&middot;</span>
            <time dateTime={report.updated_at}>
              Updated {new Date(report.updated_at).toLocaleDateString()}
            </time>
          </div>
        </header>

        {/* Content */}
        <article className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
          {contentDisplay}
        </article>

        {/* Footer */}
        <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>Shared via FeasiAI &middot; FeasiAI</p>
        </footer>
      </div>
    </div>
  )
}
