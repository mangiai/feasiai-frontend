'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Rich text editor using contentEditable with formatting toolbar.
// Uses document.execCommand for formatting (deprecated but still
// the most reliable cross-browser approach for contentEditable).
// Includes paste sanitization, link support, undo/redo, and
// table insertion.
// ──────────────────────────────────────────────────────────────

// ── Data model types ──────────────────────────────────────────

export interface EditorInline {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  href?: string
}

export interface EditorBlock {
  id: string
  type:
    | 'paragraph'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'code_block'
    | 'bulleted-list'
    | 'numbered-list'
    | 'table'
  children: EditorInline[]
  /** Only used when type === 'table' — rows of cells, each cell is HTML string */
  tableData?: string[][]
}

/** Props are intentionally kept loose (`any[]`) so existing parents don't break. */
interface PlateEditorProps {
  initialValue?: any[]
  onChange?: (value: any[]) => void
  readOnly?: boolean
}

// ── Helpers ───────────────────────────────────────────────────

let _blockId = 0
function nextBlockId(): string {
  return `blk-${Date.now()}-${++_blockId}`
}

// ── Paste sanitization ────────────────────────────────────────

/** Allowed tags that survive paste sanitization */
const SAFE_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 's', 'del',
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'blockquote', 'span', 'div', 'hr',
])

/** Allowed attributes per tag (everything else is stripped) */
const SAFE_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
}

/**
 * Walk a DOM tree and strip dangerous elements/attributes in-place.
 * - Removes script, iframe, object, embed, form, style, svg, math elements
 * - Removes all on* event handler attributes
 * - Removes javascript: URLs
 * - Keeps only SAFE_TAGS and SAFE_ATTRS
 */
function sanitizeNode(node: Node): void {
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    // Completely remove dangerous elements
    if (!SAFE_TAGS.has(tag)) {
      // Promote children before removing (e.g. <font> wrapping text)
      while (el.firstChild) {
        el.parentNode?.insertBefore(el.firstChild, el)
      }
      el.parentNode?.removeChild(el)
      return
    }

    // Strip all attributes except explicitly allowed ones
    const allowed = SAFE_ATTRS[tag] ?? new Set<string>()
    const toRemove: string[] = []
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i]
      if (attr.name.startsWith('on') || !allowed.has(attr.name)) {
        toRemove.push(attr.name)
      }
    }
    toRemove.forEach((a) => el.removeAttribute(a))

    // Strip javascript: hrefs
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? ''
      if (/^\s*javascript:/i.test(href)) {
        el.removeAttribute('href')
      }
    }
  }

  // Recurse (snapshot children because sanitizing may mutate the list)
  const children = Array.from(node.childNodes)
  children.forEach(sanitizeNode)
}

function sanitizeHtml(dirty: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(dirty, 'text/html')
  sanitizeNode(doc.body)
  return doc.body.innerHTML
}

// ── Block ↔ HTML conversion ──────────────────────────────────

function inlineToHtml(c: EditorInline): string {
  let t: string = escapeHtml(c.text ?? '')
  if (c.code) t = `<code>${t}</code>`
  if (c.bold) t = `<strong>${t}</strong>`
  if (c.italic) t = `<em>${t}</em>`
  if (c.underline) t = `<u>${t}</u>`
  if (c.strikethrough) t = `<s>${t}</s>`
  if (c.href) t = `<a href="${escapeAttr(c.href)}">${t}</a>`
  return t
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Serialize a list of EditorBlock objects → HTML string */
function blocksToHtml(blocks: EditorBlock[]): string {
  if (!Array.isArray(blocks)) return ''
  return blocks
    .map((block) => {
      // Table blocks
      if (block.type === 'table' && block.tableData) {
        const rows = block.tableData
          .map(
            (row, ri) =>
              '<tr>' +
              row.map((cell) => (ri === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`)).join('') +
              '</tr>',
          )
          .join('')
        return `<table>${rows}</table>`
      }

      const text: string =
        block?.children?.map((c) => inlineToHtml(c as EditorInline)).join('') ?? ''

      switch (block.type) {
        case 'h1':
          return `<h1>${text}</h1>`
        case 'h2':
          return `<h2>${text}</h2>`
        case 'h3':
          return `<h3>${text}</h3>`
        case 'code_block':
          return `<pre><code>${text}</code></pre>`
        case 'bulleted-list':
          return `<ul><li>${text}</li></ul>`
        case 'numbered-list':
          return `<ol><li>${text}</li></ol>`
        default:
          return `<p>${text || '<br>'}</p>`
      }
    })
    .join('\n')
}

/**
 * Recursively walk an inline node and collect EditorInline leaves,
 * inheriting formatting from ancestor tags so bold+italic nesting works.
 */
function collectInlines(
  node: Node,
  inherited: Omit<EditorInline, 'text'>,
): EditorInline[] {
  if (node.nodeType === Node.TEXT_NODE) {
    return [{ text: node.textContent ?? '', ...inherited }]
  }

  const el = node as HTMLElement
  const tag = el.tagName?.toLowerCase()

  // Accumulate formatting from this element
  const fmt: Omit<EditorInline, 'text'> = { ...inherited }
  if (tag === 'strong' || tag === 'b') fmt.bold = true
  if (tag === 'em' || tag === 'i') fmt.italic = true
  if (tag === 'u') fmt.underline = true
  if (tag === 's' || tag === 'del') fmt.strikethrough = true
  if (tag === 'code') fmt.code = true
  if (tag === 'a') {
    const href = el.getAttribute('href')
    if (href) fmt.href = href
  }

  const results: EditorInline[] = []
  el.childNodes.forEach((child) => {
    results.push(...collectInlines(child, fmt))
  })
  return results.length > 0 ? results : [{ text: '', ...fmt }]
}

function parseInlineChildren(el: HTMLElement): EditorInline[] {
  const inlines: EditorInline[] = []
  el.childNodes.forEach((child) => {
    inlines.push(...collectInlines(child, {}))
  })
  // Clean up empty-object spread artifacts (remove undefined keys)
  return inlines.length > 0
    ? inlines.map((i) => {
        const clean: EditorInline = { text: i.text }
        if (i.bold) clean.bold = true
        if (i.italic) clean.italic = true
        if (i.underline) clean.underline = true
        if (i.strikethrough) clean.strikethrough = true
        if (i.code) clean.code = true
        if (i.href) clean.href = i.href
        return clean
      })
    : [{ text: '' }]
}

/** Parse an HTML table element into tableData (string[][]) */
function parseTable(table: HTMLTableElement): string[][] {
  const data: string[][] = []
  table.querySelectorAll('tr').forEach((tr) => {
    const row: string[] = []
    tr.querySelectorAll('td, th').forEach((cell) => {
      row.push(cell.innerHTML)
    })
    data.push(row)
  })
  return data
}

/** Parse HTML back into EditorBlock[] */
function htmlToBlocks(html: string): EditorBlock[] {
  if (!html.trim()) return [{ id: nextBlockId(), type: 'paragraph', children: [{ text: '' }] }]

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const blocks: EditorBlock[] = []

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim()
      if (t) blocks.push({ id: nextBlockId(), type: 'paragraph', children: [{ text: t }] })
      return
    }
    const el = node as HTMLElement
    const tag = el.tagName?.toLowerCase()

    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
        blocks.push({ id: nextBlockId(), type: tag, children: parseInlineChildren(el) })
        break
      case 'pre':
        blocks.push({
          id: nextBlockId(),
          type: 'code_block',
          children: [{ text: el.textContent ?? '' }],
        })
        break
      case 'ul':
        el.querySelectorAll(':scope > li').forEach((li) => {
          blocks.push({
            id: nextBlockId(),
            type: 'bulleted-list',
            children: parseInlineChildren(li as HTMLElement),
          })
        })
        break
      case 'ol':
        el.querySelectorAll(':scope > li').forEach((li) => {
          blocks.push({
            id: nextBlockId(),
            type: 'numbered-list',
            children: parseInlineChildren(li as HTMLElement),
          })
        })
        break
      case 'table':
        blocks.push({
          id: nextBlockId(),
          type: 'table',
          children: [{ text: '' }],
          tableData: parseTable(el as HTMLTableElement),
        })
        break
      default:
        blocks.push({ id: nextBlockId(), type: 'paragraph', children: parseInlineChildren(el) })
    }
  })

  return blocks.length > 0 ? blocks : [{ id: nextBlockId(), type: 'paragraph', children: [{ text: '' }] }]
}

// ── Toolbar button ────────────────────────────────────────────

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault() // keep focus in editor
        onClick()
      }}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex items-center justify-center rounded px-2 py-1 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent text-accent-foreground',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarSeparator() {
  return <span className="mx-1 h-5 w-px bg-border" />
}

// ── Main component ────────────────────────────────────────────

export default function PlateEditor({ initialValue, onChange, readOnly = false }: PlateEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())

  // Set initial content on mount
  useEffect(() => {
    if (editorRef.current && initialValue) {
      editorRef.current.innerHTML = blocksToHtml(initialValue as EditorBlock[])
    }
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInput = useCallback(() => {
    if (!editorRef.current || !onChange) return
    onChange(htmlToBlocks(editorRef.current.innerHTML))
  }, [onChange])

  // Query the browser's current formatting state via queryCommandState
  const updateActiveFormats = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const formats = new Set<string>()
    // NOTE: queryCommandState is deprecated but there is no equivalent API
    if (document.queryCommandState('bold')) formats.add('bold')
    if (document.queryCommandState('italic')) formats.add('italic')
    if (document.queryCommandState('underline')) formats.add('underline')
    if (document.queryCommandState('strikethrough')) formats.add('strikethrough')
    setActiveFormats(formats)
  }, [])

  /**
   * Execute a formatting command.
   * Uses document.execCommand (deprecated but still the most reliable
   * cross-browser way to manipulate contentEditable formatting).
   */
  const exec = useCallback(
    (command: string, value?: string) => {
      // eslint-disable-next-line -- execCommand is deprecated but no replacement exists
      document.execCommand(command, false, value)
      updateActiveFormats()
      handleInput()
    },
    [updateActiveFormats, handleInput],
  )

  // ── Link insertion ────────────────────────────────────────

  const insertLink = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return

    const existingUrl = document.queryCommandValue('createLink')
    const url = window.prompt('Enter URL:', existingUrl || 'https://')
    if (!url) return

    // eslint-disable-next-line -- execCommand deprecated
    document.execCommand('createLink', false, url)
    handleInput()
  }, [handleInput])

  // ── Table insertion ───────────────────────────────────────

  const insertTable = useCallback(() => {
    const rowsStr = window.prompt('Number of rows (including header):', '3')
    const colsStr = window.prompt('Number of columns:', '3')
    const rows = Math.max(1, Math.min(20, parseInt(rowsStr ?? '3', 10) || 3))
    const cols = Math.max(1, Math.min(20, parseInt(colsStr ?? '3', 10) || 3))

    const headerCells = Array.from({ length: cols }, (_, i) => `<th>Header ${i + 1}</th>`).join('')
    const bodyRows = Array.from(
      { length: rows - 1 },
      () => '<tr>' + Array.from({ length: cols }, () => '<td>&nbsp;</td>').join('') + '</tr>',
    ).join('')

    const tableHtml =
      `<table><tr>${headerCells}</tr>${bodyRows}</table><p><br></p>`

    // eslint-disable-next-line -- execCommand deprecated
    document.execCommand('insertHTML', false, tableHtml)
    handleInput()
  }, [handleInput])

  // ── Paste sanitization ────────────────────────────────────

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const html = e.clipboardData.getData('text/html')
      const plain = e.clipboardData.getData('text/plain')

      if (html) {
        e.preventDefault()
        const clean = sanitizeHtml(html)
        // eslint-disable-next-line -- execCommand deprecated, but insertHTML has no replacement
        document.execCommand('insertHTML', false, clean)
        handleInput()
      } else if (plain) {
        // Let default plain-text paste happen — it's already safe
      }
    },
    [handleInput],
  )

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
          {/* Undo / Redo — these execCommand calls are well-supported everywhere */}
          <ToolbarButton onClick={() => exec('undo')} title="Undo (Ctrl+Z)">
            ↩
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('redo')} title="Redo (Ctrl+Y)">
            ↪
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Inline formatting */}
          <ToolbarButton active={activeFormats.has('bold')} onClick={() => exec('bold')} title="Bold">
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton active={activeFormats.has('italic')} onClick={() => exec('italic')} title="Italic">
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton
            active={activeFormats.has('underline')}
            onClick={() => exec('underline')}
            title="Underline"
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton
            active={activeFormats.has('strikethrough')}
            onClick={() => exec('strikethrough')}
            title="Strikethrough"
          >
            <span className="line-through">S</span>
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Block formatting */}
          <ToolbarButton onClick={() => exec('formatBlock', 'h1')} title="Heading 1">
            H1
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('formatBlock', 'h2')} title="Heading 2">
            H2
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('formatBlock', 'h3')} title="Heading 3">
            H3
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Lists */}
          <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet list">
            • List
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numbered list">
            1. List
          </ToolbarButton>
          <ToolbarButton onClick={() => exec('formatBlock', 'pre')} title="Code block">
            {'</>'}
          </ToolbarButton>

          <ToolbarSeparator />

          {/* Link */}
          <ToolbarButton onClick={insertLink} title="Insert link">
            🔗
          </ToolbarButton>

          {/* Table */}
          <ToolbarButton onClick={insertTable} title="Insert table">
            ⊞
          </ToolbarButton>
        </div>
      )}

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        className={cn(
          'min-h-[400px] p-4 outline-none',
          'prose prose-sm max-w-none dark:prose-invert',
          '[&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:p-2',
          'focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-b-lg',
          readOnly && 'cursor-default',
        )}
        role="textbox"
        aria-multiline="true"
        aria-label="Rich text editor"
      />
    </div>
  )
}
