'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'
import { reportFontClassName } from '@/lib/report-fonts'

const markdownComponents: Components = {
  table: ({ children }) => (
    <div className="md-table-scroll" role="region" tabIndex={0} aria-label="Data table">
      <table>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  th: ({ children }) => <th scope="col">{children}</th>,
  blockquote: ({ children }) => (
    <blockquote className="md-callout">{children}</blockquote>
  ),
  hr: () => <hr className="md-divider" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
      {children}
    </a>
  ),
}

export interface MarkdownDocumentViewerProps {
  content?: string | null
  className?: string
  /** Constrain line length for narrative sections (tables still scroll horizontally) */
  readingWidth?: 'default' | 'wide' | 'full'
  emptyMessage?: string
}

export function MarkdownDocumentViewer({
  content,
  className,
  readingWidth = 'default',
  emptyMessage = 'No content available.',
}: MarkdownDocumentViewerProps) {
  const trimmed = (content ?? '').trim()

  return (
    <article
      className={cn(
        'markdown-document',
        reportFontClassName,
        readingWidth === 'wide' && 'markdown-document--wide',
        readingWidth === 'full' && 'markdown-document--full',
        className,
      )}
    >
      <div className="markdown-document-surface scrollbar-thin">
        <div className="prose-feasiai">
          {trimmed ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
              components={markdownComponents}
            >
              {trimmed}
            </ReactMarkdown>
          ) : (
            <p className="md-empty">{emptyMessage}</p>
          )}
        </div>
      </div>
    </article>
  )
}
