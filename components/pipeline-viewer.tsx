'use client'

import { useState, useEffect, useRef, useMemo, type ElementType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeAuth } from '@/lib/supabase/use-realtime-auth'
import {
  MapPinIcon,
  SearchIcon,
  ScaleIcon,
  BrainCircuitIcon,
  PenToolIcon,
  FileTextIcon,
  SparklesIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PauseIcon,
  StopCircleIcon,
  ScanTextIcon,
  TagsIcon,
  FileEditIcon,
  MessageSquareIcon,
  FileOutputIcon,
  ClockIcon,
  AlertCircleIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { APP_DB_SCHEMA } from '@/lib/app-schema'

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

interface Message {
  id: number
  role: 'tool' | 'assistant' | 'system'
  content: string
  created_at: string
}

interface AgentDef {
  name: string
  icon: ElementType
  color: string
}

type AgentStatus = 'idle' | 'running' | 'done'

/* ═══════════════════════════════════════════════════════════
   AGENT DEFINITIONS PER FLOW TYPE
   ═══════════════════════════════════════════════════════════ */

const FEASIBILITY_AGENTS: AgentDef[] = [
  { name: 'Zoning Lookup', icon: MapPinIcon, color: 'text-blue-400' },
  { name: 'Code Researcher', icon: SearchIcon, color: 'text-amber-400' },
  { name: 'Plan Analyst', icon: ScaleIcon, color: 'text-emerald-400' },
  { name: 'Feasibility Engine', icon: BrainCircuitIcon, color: 'text-violet-400' },
  { name: 'Report Writer', icon: PenToolIcon, color: 'text-rose-400' },
]

const CITY_REVIEW_AGENTS: AgentDef[] = [
  { name: 'Plan Extractor', icon: ScanTextIcon, color: 'text-blue-400' },
  { name: 'Code Researcher', icon: SearchIcon, color: 'text-amber-400' },
  { name: 'Review Analyst', icon: ScaleIcon, color: 'text-emerald-400' },
  { name: 'Report Generator', icon: PenToolIcon, color: 'text-rose-400' },
]

const CORRECTIONS_P1_AGENTS: AgentDef[] = [
  { name: 'Letter Parser', icon: ScanTextIcon, color: 'text-blue-400' },
  { name: 'Corrections Analyst', icon: ScaleIcon, color: 'text-amber-400' },
  { name: 'Code Researcher', icon: SearchIcon, color: 'text-emerald-400' },
  { name: 'Priority Engine', icon: TagsIcon, color: 'text-violet-400' },
  { name: 'Response Builder', icon: FileEditIcon, color: 'text-rose-400' },
]

const CORRECTIONS_P2_AGENTS: AgentDef[] = [
  { name: 'Answer Processor', icon: MessageSquareIcon, color: 'text-blue-400' },
  { name: 'Code Researcher', icon: SearchIcon, color: 'text-amber-400' },
  { name: 'Response Writer', icon: PenToolIcon, color: 'text-emerald-400' },
  { name: 'Report Generator', icon: FileOutputIcon, color: 'text-rose-400' },
]

function getAgents(flowType: string, status: string): AgentDef[] {
  if (flowType === 'feasibility-analysis') return FEASIBILITY_AGENTS
  if (flowType === 'city-review') return CITY_REVIEW_AGENTS
  if (status === 'processing-phase2') return CORRECTIONS_P2_AGENTS
  return CORRECTIONS_P1_AGENTS
}

/* ═══════════════════════════════════════════════════════════
   PHASE DETECTION — content-based pipeline phase tracking
   ═══════════════════════════════════════════════════════════ */

/**
 * Build a per-message phase assignment from content patterns.
 * Returns array aligned with messages[], each value being the 0-based
 * agent phase index active at that point.
 *
 * Priority: [PHASE:N] server hints > tool patterns > assistant text
 * Monotonic: phase only advances forward, never backwards.
 */
function buildMessagePhaseMap(messages: Message[], agentCount: number): number[] {
  if (agentCount === 0) return messages.map(() => 0)
  const maxIdx = agentCount - 1
  let runningPhase = 0

  return messages.map((msg) => {
    // Primary: server-side [PHASE:N] hints (most reliable)
    const hint = msg.content.match(/\[PHASE:(\d+)\]/)
    if (hint) {
      const p = Math.min(parseInt(hint[1]), maxIdx)
      if (p > runningPhase) runningPhase = p
      return runningPhase
    }

    // Secondary: tool message patterns
    if (msg.role === 'tool') {
      let detected = -1
      if (/^Write:.*output\//i.test(msg.content)) detected = 4
      else if (/^Task:/i.test(msg.content)) detected = 3
      else if (/\.(png|jpg|jpeg|pdf)/i.test(msg.content)) detected = 2
      else if (/references-(chip|strategies|standards|digest)|agent-prompts/i.test(msg.content)) detected = 1
      else if (/^Grep:/i.test(msg.content)) detected = 1

      if (detected > runningPhase) runningPhase = Math.min(detected, maxIdx)
    }

    // Tertiary: assistant text patterns (weaker signals)
    if (msg.role === 'assistant') {
      let detected = -1
      if (/writ(e|ing).*(feasibility|final).?report|executive.?summary/i.test(msg.content)) detected = 4
      else if (/strateg(y|ies).*(evaluat|compar)|density.?bonus|test.?fit/i.test(msg.content)) detected = 3
      else if (/plan.?(sheet|analysis)|floor.?plan|site.?plan/i.test(msg.content)) detected = 2

      if (detected > runningPhase) runningPhase = Math.min(detected, maxIdx)
    }

    return runningPhase
  })
}

/** Get the current active phase from the full message set. */
function getActivePhaseFromMessages(messages: Message[], agentCount: number): number {
  if (messages.length === 0 || agentCount === 0) return 0
  const phases = buildMessagePhaseMap(messages, agentCount)
  return phases[phases.length - 1]
}

/* ═══════════════════════════════════════════════════════════
   AGENT CARD
   ═══════════════════════════════════════════════════════════ */

function AgentCard({
  agent,
  status,
  message,
}: {
  agent: AgentDef
  status: AgentStatus
  message: string
}) {
  const Icon = agent.icon

  return (
    <motion.div
      layout
      className={cn(
        'relative flex items-start gap-3 w-full rounded-xl border p-3 sm:p-4 text-left transition-all duration-300',
        status === 'running'
          ? 'border-secondary/40 bg-secondary/[0.06] shadow-[0_0_20px_rgba(245,130,32,0.05)]'
          : status === 'done'
            ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
            : 'border-foreground/[0.08] bg-foreground/[0.02]',
      )}
    >
      {/* Agent icon */}
      <div
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors duration-300',
          status === 'running'
            ? 'bg-secondary/15'
            : status === 'done'
              ? 'bg-emerald-500/10'
              : 'bg-foreground/[0.06]',
        )}
      >
        {status === 'running' ? (
          <Loader2Icon className="w-4 h-4 text-secondary animate-spin" />
        ) : status === 'done' ? (
          <CheckCircle2Icon className="w-4 h-4 text-emerald-400" />
        ) : (
          <Icon className={cn('w-4 h-4', agent.color, 'opacity-40')} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={cn(
              'text-xs font-semibold tracking-tight',
              status === 'idle' ? 'text-foreground/40' : 'text-foreground',
            )}
          >
            {agent.name}
          </span>
          {status === 'running' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-[11px] leading-relaxed truncate',
            status === 'idle' ? 'text-foreground/25' : 'text-foreground/50',
          )}
        >
          {message}
        </p>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CONNECTION LINE BETWEEN AGENTS
   ═══════════════════════════════════════════════════════════ */

function ConnectionDot({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center py-0.5">
      <motion.div
        className={cn(
          'w-px h-4 rounded-full transition-colors duration-500',
          active ? 'bg-secondary/40' : 'bg-foreground/[0.06]',
        )}
        animate={active ? { opacity: [0.3, 1, 0.3] } : {}}
        transition={active ? { duration: 1.5, repeat: Infinity } : {}}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   REPORT PREVIEW (live progress)
   ═══════════════════════════════════════════════════════════ */

const REPORT_FILENAME_MAP: Record<string, string> = {
  'city-review': 'city-review-report.pdf',
  'corrections-analysis': 'corrections-report.pdf',
  'corrections-response': 'corrections-response.pdf',
  'feasibility-analysis': 'feasibility-report.pdf',
}

function ReportPreview({
  agents,
  activePhase,
  address,
  flowType,
}: {
  agents: AgentDef[]
  activePhase: number
  address: string
  flowType?: string
}) {
  const completedAgents = agents.slice(0, activePhase)
  const baseLabel =
    (flowType && REPORT_FILENAME_MAP[flowType]?.replace(/\.pdf$/i, '')) || 'feasibility-report'
  const addressSlug = address
    ? address.replace(/[^a-zA-Z0-9._\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80)
    : ''
  const filename = addressSlug ? `${addressSlug}-${baseLabel}.pdf` : `${baseLabel}.pdf`

  return (
    <div className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.03] overflow-hidden">
      {/* Doc toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-foreground/[0.08] bg-foreground/[0.02]">
        <FileTextIcon className="w-3.5 h-3.5 text-secondary/70" />
        <span className="text-[11px] font-medium text-foreground/60">{filename}</span>
        <span className="ml-auto text-[10px] text-foreground/30">generating…</span>
      </div>

      {/* Doc content */}
      <div className="p-4 sm:p-5 space-y-1.5 font-mono text-[11px] leading-relaxed min-h-[200px] max-h-[320px] overflow-y-auto scrollbar-thin">
        {/* Header — always visible */}
        <p className="text-foreground font-bold text-xs">Development Feasibility Report</p>
        {address && <p className="text-foreground font-bold text-xs">{address}</p>}
        <div className="border-b border-foreground/[0.08] my-2" />

        {/* Progressive reveal as agents complete */}
        <AnimatePresence>
          {completedAgents.map((agent, i) => (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <p className="text-emerald-400/70 pl-2">
                ✓ {agent.name} — complete
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Current agent working indicator */}
        {activePhase < agents.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2"
          >
            <p className="text-secondary/60 pl-2">
              ⟳ {agents[activePhase].name} — working…
            </p>
          </motion.div>
        )}

        {/* Blinking cursor */}
        <motion.span
          className="inline-block w-1.5 h-3.5 bg-secondary/60 rounded-sm mt-1"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY LOG
   ═══════════════════════════════════════════════════════════ */

function ActivityLog({
  messages,
  agents,
  messagePhases,
}: {
  messages: Message[]
  agents: AgentDef[]
  messagePhases: number[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const getIconForIndex = (index: number) => {
    if (agents.length === 0) return SparklesIcon
    return agents[messagePhases[index] ?? 0]?.icon ?? SparklesIcon
  }

  const getColorForIndex = (index: number) => {
    if (agents.length === 0) return 'text-foreground/40'
    return agents[messagePhases[index] ?? 0]?.color ?? 'text-foreground/40'
  }

  return (
    <div className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-foreground/[0.08] bg-foreground/[0.02]">
        <SparklesIcon className="w-3.5 h-3.5 text-secondary/70" />
        <span className="text-[11px] font-medium text-foreground/60">Agent Activity</span>
        <span className="ml-auto text-[10px] text-foreground/30">{messages.length} events</span>
      </div>
      <div ref={scrollRef} className="p-3 max-h-[160px] overflow-y-auto space-y-1 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-secondary animate-ping absolute" />
              <div className="w-3 h-3 rounded-full bg-secondary" />
            </div>
            <span className="text-[11px] text-foreground/40">Waiting for agent activity…</span>
          </div>
        ) : (
          messages.map((msg, i) => {
            const MsgIcon = getIconForIndex(i)
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 py-1 px-1.5 rounded text-[10px]"
              >
                <MsgIcon className={cn('w-3 h-3 mt-0.5 shrink-0 opacity-60', getColorForIndex(i))} />
                <span className="text-foreground/45 leading-snug line-clamp-2">{msg.content}</span>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PIPELINE VIEWER
   ═══════════════════════════════════════════════════════════ */

interface PipelineViewerProps {
  projectId: string
  projectName: string
  address: string
  flowType: string
  status: string
  heading: string
  /** Phase override from devtools or parent — if null, auto-advance is used */
  phaseOverride?: number
  onPause: () => void
  onCancel: () => void
  isPausing: boolean
  isCancelling: boolean
}

const FALLBACK_PHASE_DURATION_MS = 300_000 // 5 min per phase — ultra-slow time-based fallback

export function PipelineViewer({
  projectId,
  projectName,
  address,
  flowType,
  status,
  heading,
  phaseOverride,
  onPause,
  onCancel,
  isPausing,
  isCancelling,
}: PipelineViewerProps) {
  const agents = useMemo(() => getAgents(flowType, status), [flowType, status])
  const [messages, setMessages] = useState<Message[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [autoPhase, setAutoPhase] = useState(0)
  const [staleSeconds, setStaleSeconds] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const lastMessageTimeRef = useRef<number>(Date.now())
  const supabase = useMemo(() => createClient(), [])
  const realtimeReady = useRealtimeAuth(supabase)

  // Active phase: devtools override > auto-advance
  const activePhase = phaseOverride ?? autoPhase

  // Fetch initial messages
  useEffect(() => {
    supabase
      .schema(APP_DB_SCHEMA)
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('id', { ascending: true })
      .then(({ data, error: queryError }) => {
        if (queryError) {
          console.error('Failed to fetch messages:', queryError)
          setFetchError('Failed to load pipeline messages.')
          return
        }
        if (data && data.length > 0) {
          setMessages(data as Message[])
          lastMessageTimeRef.current = Date.now()
          if (!startTimeRef.current) {
            startTimeRef.current = new Date(data[0].created_at).getTime()
          }
        }
      })
  }, [projectId, supabase])

  // Realtime: new messages
  useEffect(() => {
    if (!realtimeReady) return

    const channel = supabase
      .channel(`pipeline-msgs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: APP_DB_SCHEMA,
          table: 'messages',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
          lastMessageTimeRef.current = Date.now()
          setStaleSeconds(0)
          if (!startTimeRef.current) {
            startTimeRef.current = Date.now()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase, realtimeReady])

  // Message phase map for activity log icon/color mapping
  const messagePhases = useMemo(
    () => buildMessagePhaseMap(messages, agents.length),
    [messages, agents.length],
  )

  // Primary: advance phase based on message content analysis
  useEffect(() => {
    if (phaseOverride != null) return
    if (messages.length === 0) return
    const contentPhase = getActivePhaseFromMessages(messages, agents.length)
    setAutoPhase(prev => Math.max(prev, contentPhase))
  }, [messages.length, agents.length, phaseOverride])

  // Fallback: ultra-slow time-based advance (only if message detection hasn't progressed)
  useEffect(() => {
    if (phaseOverride != null) return
    const interval = setInterval(() => {
      if (!startTimeRef.current) return
      const elapsed = Date.now() - startTimeRef.current
      const timePhase = Math.min(
        Math.floor(elapsed / FALLBACK_PHASE_DURATION_MS),
        agents.length - 1,
      )
      setAutoPhase(prev => Math.max(prev, timePhase))
    }, 5000)
    return () => clearInterval(interval)
  }, [agents.length, phaseOverride])

  // Detect completion from messages
  useEffect(() => {
    const last = messages[messages.length - 1]
    if (last?.role === 'system' && last.content.startsWith('Completed in ')) {
      setAutoPhase(agents.length) // all done
    }
  }, [messages, agents.length])

  // Stale timer
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastMessageTimeRef.current
      setStaleSeconds(Math.floor(elapsed / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Derive agent statuses
  const agentStatuses: AgentStatus[] = agents.map((_, i) => {
    if (i < activePhase) return 'done'
    if (i === activePhase) return 'running'
    return 'idle'
  })

  // Get latest message for the running agent
  const latestMessage = messages.length > 0 ? messages[messages.length - 1].content : ''

  // Progress percentage
  const progress = agents.length > 0
    ? Math.min(((activePhase + (activePhase < agents.length ? 0.5 : 0)) / agents.length) * 100, 100)
    : 0

  const isStale = staleSeconds >= 90 && messages.length > 0

  // Failed status — show error card instead of analyzing animation
  if (status === 'failed') {
    const lastError = messages.length > 0 ? messages[messages.length - 1].content : 'An unknown error occurred.'
    return (
      <div className="space-y-4 animate-fade-up">
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.05] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/15">
              <AlertCircleIcon className="w-4 h-4 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {address || projectName}
              </p>
              <p className="text-[11px] text-destructive/80">Pipeline failed</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{lastError}</p>
        </div>
        {fetchError && (
          <p className="text-xs text-destructive text-center">{fetchError}</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Address Bar + Status */}
      <div className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.03] p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10">
            <MapPinIcon className="w-4 h-4 text-secondary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {address || projectName}
            </p>
            <p className="text-[11px] text-foreground/50">{heading}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isStale ? (
              <ClockIcon className="w-4 h-4 text-warning animate-pulse" />
            ) : (
              <Loader2Icon className="w-4 h-4 text-secondary animate-spin" />
            )}
            <span className="text-[11px] font-medium text-foreground/50">
              {isStale
                ? `Thinking… ${Math.floor(staleSeconds / 60)}:${String(staleSeconds % 60).padStart(2, '0')}`
                : 'Analyzing…'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-secondary/80 to-secondary"
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Grid: Agents (left) + Report/Activity (right) */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Left Column: Agent Cards */}
        <div className="space-y-0">
          {agents.map((agent, i) => (
            <div key={agent.name}>
              <AgentCard
                agent={agent}
                status={agentStatuses[i]}
                message={
                  agentStatuses[i] === 'running'
                    ? latestMessage || 'Processing…'
                    : agentStatuses[i] === 'done'
                      ? 'Complete'
                      : 'Waiting…'
                }
              />
              {i < agents.length - 1 && (
                <ConnectionDot active={i < activePhase} />
              )}
            </div>
          ))}
        </div>

        {/* Right Column: Report + Activity Log */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          <ReportPreview
            agents={agents}
            activePhase={activePhase}
            address={address || projectName}
            flowType={flowType}
          />
          <ActivityLog
            messages={messages}
            agents={agents}
            messagePhases={messagePhases}
          />
        </div>
      </div>

      {/* Pipeline Controls */}
      <div className="flex justify-center gap-3 pt-2">
        <Button
          onClick={onPause}
          disabled={isPausing}
          variant="outline"
          className="rounded-full font-body"
        >
          {isPausing ? (
            <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <PauseIcon className="w-4 h-4 mr-2" />
          )}
          {isPausing ? 'Pausing…' : 'Pause'}
        </Button>
        <Button
          onClick={onCancel}
          disabled={isCancelling}
          variant="destructive"
          className="rounded-full font-body"
        >
          {isCancelling ? (
            <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <StopCircleIcon className="w-4 h-4 mr-2" />
          )}
          {isCancelling ? 'Cancelling…' : 'Cancel'}
        </Button>
      </div>
    </div>
  )
}
