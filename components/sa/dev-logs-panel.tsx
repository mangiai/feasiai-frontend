'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CopyIcon, PauseIcon, PlayIcon, Trash2Icon, WifiIcon, WifiOffIcon } from 'lucide-react'

export type LogCategory = 'all' | 'stdout' | 'agent' | 'dev'

export interface LogEntry {
  id: string
  category: 'stdout' | 'agent' | 'dev'
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  meta?: Record<string, unknown>
}

const TABS: Array<{ id: LogCategory; label: string; description: string }> = [
  { id: 'all', label: 'All', description: 'Every captured stream' },
  { id: 'agent', label: 'Agent Logs', description: 'Pipeline + insertMessage agent events' },
  { id: 'dev', label: 'Dev Logs', description: 'Structured Pino server logs' },
  { id: 'stdout', label: 'Stdout Logs', description: 'Raw console output' },
]

const LEVEL_STYLES: Record<LogEntry['level'], string> = {
  debug: 'text-muted-foreground',
  info: 'text-emerald-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
}

function getLogStreamHttpBase(): string {
  const explicit = process.env.NEXT_PUBLIC_SERVER_URL?.trim().replace(/\/$/, '')
  if (explicit) return explicit

  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:8080`
    }
  }

  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080'
}

function buildWebSocketUrl(ticket: string, category: LogCategory): string {
  const httpBase = getLogStreamHttpBase()
  const wsBase = httpBase.replace(/^http/i, 'ws')
  const params = new URLSearchParams({ ticket, category })
  return `${wsBase}/admin/dev-logs/ws?${params.toString()}`
}

async function fetchWsTicket(): Promise<string> {
  const res = await fetch('/api/sa/dev-logs/ws-ticket', { method: 'POST', cache: 'no-store' })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(payload.error || `Failed to issue log stream ticket (${res.status})`)
  }
  const payload = await res.json() as { ticket?: string }
  if (!payload.ticket) throw new Error('Missing WebSocket ticket')
  return payload.ticket
}

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatEntryLine(entry: LogEntry): string {
  const metaBits = [
    entry.meta?.projectId ? `project=${String(entry.meta.projectId).slice(0, 8)}` : null,
    entry.meta?.role ? `role=${String(entry.meta.role)}` : null,
  ].filter(Boolean)

  return [
    formatTimestamp(entry.timestamp),
    `[${entry.level.toUpperCase()}]`,
    `[${entry.category.toUpperCase()}]`,
    metaBits.length > 0 ? metaBits.join(' ') : null,
    entry.message,
  ].filter(Boolean).join(' ')
}

function formatLogsText(entries: LogEntry[]): string {
  return entries.map(formatEntryLine).join('\n')
}

function LogLine({ entry }: { entry: LogEntry }) {
  const categoryColor =
    entry.category === 'agent' ? 'text-sky-300' :
    entry.category === 'dev' ? 'text-violet-300' : 'text-slate-300'

  const metaBits = [
    entry.meta?.projectId ? `project=${String(entry.meta.projectId).slice(0, 8)}` : null,
    entry.meta?.role ? `role=${String(entry.meta.role)}` : null,
  ].filter(Boolean)

  return (
    <div className="whitespace-pre-wrap break-words border-b border-white/5 py-1.5 last:border-b-0">
      <span className="text-slate-500">{formatTimestamp(entry.timestamp)} </span>
      <span className={cn('uppercase', LEVEL_STYLES[entry.level])}>[{entry.level}]</span>
      <span className={cn(' ml-2 uppercase', categoryColor)}>[{entry.category}]</span>
      {metaBits.length > 0 && <span className="ml-2 text-slate-500">{metaBits.join(' ')}</span>}
      <span className="ml-2 text-slate-100">{entry.message}</span>
    </div>
  )
}

export function DevLogsPanel() {
  const [activeTab, setActiveTab] = useState<LogCategory>('all')
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [paused, setPaused] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pausedRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => { pausedRef.current = paused }, [paused])

  const appendEntries = useCallback((incoming: LogEntry[]) => {
    if (pausedRef.current || incoming.length === 0) return
    setEntries((current) => [...current, ...incoming].slice(-2000))
  }, [])

  const loadRecent = useCallback(async (category: LogCategory) => {
    const res = await fetch(`/api/sa/dev-logs?category=${category}&limit=500`, { cache: 'no-store' })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      throw new Error(payload.error || `Failed to load logs (${res.status})`)
    }
    const payload = await res.json() as { entries?: LogEntry[] }
    setEntries(payload.entries ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = async () => {
      try {
        setError(null)
        await loadRecent(activeTab)
        const ticket = await fetchWsTicket()
        if (cancelled) return

        wsRef.current?.close()
        const ws = new WebSocket(buildWebSocketUrl(ticket, activeTab))
        wsRef.current = ws
        ws.onopen = () => {
          if (!cancelled) {
            setConnected(true)
            setError(null)
          }
        }
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data)) as { type?: string; entry?: LogEntry; entries?: LogEntry[] }
            if (payload.type === 'connected' && Array.isArray(payload.entries)) { setEntries(payload.entries); return }
            if (payload.type === 'log' && payload.entry) appendEntries([payload.entry])
          } catch { /* ignore */ }
        }
        ws.onclose = () => {
          setConnected(false)
          if (!cancelled) reconnectTimer = setTimeout(() => { void connect() }, 3000)
        }
        ws.onerror = () => { setConnected(false); setError('WebSocket connection error') }
      } catch (err) {
        setConnected(false)
        setError(err instanceof Error ? err.message : 'Failed to connect to log stream')
      }
    }

    void connect()
    return () => {
      cancelled = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [activeTab, appendEntries, loadRecent])

  useEffect(() => {
    const node = scrollRef.current
    if (!node || paused) return
    node.scrollTop = node.scrollHeight
  }, [entries, paused])

  const copyLogs = useCallback(async () => {
    if (entries.length === 0) return
    try {
      await navigator.clipboard.writeText(formatLogsText(entries))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy logs to clipboard')
    }
  }, [entries])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={cn('rounded-full border px-4 py-2 text-left transition-colors',
              activeTab === tab.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground')}>
            <div className="text-sm font-medium">{tab.label}</div>
            <div className="text-xs opacity-80">{tab.description}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={connected ? 'default' : 'secondary'} className="gap-1">
          {connected ? <WifiIcon className="w-3 h-3" /> : <WifiOffIcon className="w-3 h-3" />}
          {connected ? 'Live' : 'Reconnecting'}
        </Badge>
        <Badge variant="outline">{entries.length} lines</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void copyLogs()} disabled={entries.length === 0}>
            <CopyIcon className="w-4 h-4 mr-1" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setPaused((v) => !v)}>
            {paused ? <PlayIcon className="w-4 h-4 mr-1" /> : <PauseIcon className="w-4 h-4 mr-1" />}
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEntries([])}>
            <Trash2Icon className="w-4 h-4 mr-1" /> Clear
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div ref={scrollRef} className="h-[65vh] overflow-y-auto rounded-xl border border-border/60 bg-[#0b1020] p-4 font-mono text-[12px] leading-5 text-slate-100 shadow-inner">
        {entries.length === 0 ? <p className="text-slate-400">Waiting for server logs...</p> : entries.map((e) => <LogLine key={e.id} entry={e} />)}
      </div>
    </div>
  )
}
