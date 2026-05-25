'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import {
  MapPinIcon,
  FileTextIcon,
  BrainCircuitIcon,
  SearchIcon,
  ScaleIcon,
  PenToolIcon,
  CheckCircle2Icon,
  Loader2Icon,
  ArrowRightIcon,
  SparklesIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════
   SCRIPTED DEMO DATA
   ═══════════════════════════════════════════════════════════ */

const DEMO_ADDRESS = '1847 Walgrove Ave, Los Angeles, CA 90066'
const FEASIBILITY_ADDRESS = '5420 Wilshire Blvd, Los Angeles, CA 90036'

type AgentId = 'zoning' | 'code' | 'plan' | 'feasibility' | 'report'

interface Agent {
  id: AgentId
  name: string
  icon: typeof MapPinIcon
  color: string
}

const AGENTS: Agent[] = [
  { id: 'zoning', name: 'Zoning Lookup', icon: MapPinIcon, color: 'text-blue-400' },
  { id: 'code', name: 'Code Researcher', icon: SearchIcon, color: 'text-amber-400' },
  { id: 'plan', name: 'Plan Analyst', icon: ScaleIcon, color: 'text-emerald-400' },
  { id: 'feasibility', name: 'Feasibility Engine', icon: BrainCircuitIcon, color: 'text-violet-400' },
  { id: 'report', name: 'Report Writer', icon: PenToolIcon, color: 'text-rose-400' },
]

const FEASIBILITY_AGENTS: Agent[] = [
  { id: 'zoning', name: 'ZIMAS Data Agent', icon: MapPinIcon, color: 'text-blue-400' },
  { id: 'code', name: 'Transit & Adjacency', icon: SearchIcon, color: 'text-amber-400' },
  { id: 'plan', name: 'Strategy Evaluator', icon: ScaleIcon, color: 'text-emerald-400' },
  { id: 'feasibility', name: 'Density & FAR Engine', icon: BrainCircuitIcon, color: 'text-violet-400' },
  { id: 'report', name: 'Report Assembly', icon: PenToolIcon, color: 'text-rose-400' },
]

type StepStatus = 'idle' | 'running' | 'done'

interface TimelineEvent {
  time: number // ms from start
  agent: AgentId
  status: StepStatus
  message: string
}

const TIMELINE: TimelineEvent[] = [
  { time: 0, agent: 'zoning', status: 'running', message: 'Querying ZIMAS for parcel data…' },
  { time: 1400, agent: 'zoning', status: 'running', message: 'Zone: R1-1 — 7,498 sq ft lot detected' },
  { time: 2800, agent: 'zoning', status: 'done', message: 'Zoning + overlay data complete' },
  { time: 2900, agent: 'code', status: 'running', message: 'Researching LA Municipal Code §12.22-A.31…' },
  { time: 4200, agent: 'code', status: 'running', message: 'Found: ADU ≤ 1,200 sf, 4ft side setback, 16ft height' },
  { time: 5600, agent: 'code', status: 'done', message: 'Code extraction complete — 12 rules indexed' },
  { time: 5700, agent: 'plan', status: 'running', message: 'Analyzing plan sheets at 7,400px resolution…' },
  { time: 7200, agent: 'plan', status: 'running', message: 'Checking setbacks: 4ft sides ✓, 4ft rear ✓' },
  { time: 8400, agent: 'plan', status: 'done', message: 'Plan analysis complete — 0 issues found' },
  { time: 8500, agent: 'feasibility', status: 'running', message: 'Running financial model…' },
  { time: 10000, agent: 'feasibility', status: 'running', message: 'Estimated build cost: $185k – $225k' },
  { time: 11200, agent: 'feasibility', status: 'done', message: 'Feasibility: FAVORABLE — ADU approved path' },
  { time: 11300, agent: 'report', status: 'running', message: 'Compiling report sections…' },
  { time: 12800, agent: 'report', status: 'running', message: 'Adding citations from CA ADU Handbook §§3–7…' },
  { time: 14200, agent: 'report', status: 'done', message: 'Report generated — 24 pages, 47 citations' },
]

const REPORT_LINES = [
  { section: 'header', text: 'Development Feasibility Report' },
  { section: 'header', text: '1847 Walgrove Ave, Los Angeles 90066' },
  { section: 'divider', text: '' },
  { section: 'heading', text: '1. Parcel Summary' },
  { section: 'body', text: 'Zone: R1-1 | Lot: 7,498 sf | FAR: 0.45' },
  { section: 'body', text: 'Existing: 1,420 sf SFR — no accessory structures' },
  { section: 'heading', text: '2. ADU Eligibility' },
  { section: 'body', text: '✓ Detached ADU up to 1,200 sf permitted' },
  { section: 'body', text: '✓ 4ft side/rear setback compliant' },
  { section: 'body', text: '✓ 16ft height limit — single story fits' },
  { section: 'heading', text: '3. Financial Analysis' },
  { section: 'body', text: 'Build cost estimate: $185,000 – $225,000' },
  { section: 'body', text: 'Projected rental income: $2,800/mo' },
  { section: 'body', text: 'ROI payback period: 5.8 – 7.1 years' },
  { section: 'heading', text: '4. Recommendation' },
  { section: 'highlight', text: 'FAVORABLE — Proceed with ADU development' },
]

/* ——— Feasibility variant data ——— */

const FEASIBILITY_TIMELINE: TimelineEvent[] = [
  { time: 0, agent: 'zoning', status: 'running', message: 'Querying ZIMAS for 5420 Wilshire Blvd…' },
  { time: 1200, agent: 'zoning', status: 'running', message: 'Zone: C4-2D-SN — 18,750 sf lot, Miracle Mile CDO' },
  { time: 2400, agent: 'zoning', status: 'done', message: 'Parcel data complete — Q conditions, D limitation found' },
  { time: 2500, agent: 'code', status: 'running', message: 'Calculating transit proximity — Metro Purple Line…' },
  { time: 3800, agent: 'code', status: 'running', message: 'Major transit stop: 0.18 mi — TOC Tier 3 eligible' },
  { time: 5200, agent: 'code', status: 'done', message: 'Transit + adjacency complete — 4 overlays mapped' },
  { time: 5300, agent: 'plan', status: 'running', message: 'Evaluating 11 strategies: By-Right, AB 1287, TOC, CHIP…' },
  { time: 6800, agent: 'plan', status: 'running', message: 'AB 1287: 100% density bonus → 72 units (base 36)' },
  { time: 8200, agent: 'plan', status: 'running', message: 'CHIP TOC Tier 3: 80% bonus → 65 units, FAR 4.25' },
  { time: 9600, agent: 'plan', status: 'done', message: '7 of 11 strategies viable — AB 2334 not eligible (VMT)' },
  { time: 9700, agent: 'feasibility', status: 'running', message: 'Computing density: MARD = 36 base → rounding up per §12.22…' },
  { time: 11000, agent: 'feasibility', status: 'running', message: 'Affordability: 11% VLI (8 units) for AB 1287 100% bonus' },
  { time: 12400, agent: 'feasibility', status: 'running', message: 'Parking: 0.5 spaces/unit (transit reduction) = 36 spaces' },
  { time: 13800, agent: 'feasibility', status: 'done', message: 'Best strategy: AB 1287 — 72 units, 87,500 sf buildable' },
  { time: 13900, agent: 'report', status: 'running', message: 'Assembling strategy comparison matrix…' },
  { time: 15400, agent: 'report', status: 'running', message: 'Adding CHIP Ord. 188,477 & Gov Code §65915 citations…' },
  { time: 16800, agent: 'report', status: 'done', message: 'Report generated — 20 pages, 11 strategies, 53 citations' },
]

const FEASIBILITY_REPORT_LINES = [
  { section: 'header', text: 'Multi-Strategy Feasibility Report' },
  { section: 'header', text: '5420 Wilshire Blvd, Los Angeles 90036' },
  { section: 'divider', text: '' },
  { section: 'heading', text: '1. Parcel & Zoning Profile' },
  { section: 'body', text: 'Zone: C4-2D-SN | Lot: 18,750 sf | FAR: 3.0 (base)' },
  { section: 'body', text: 'Overlays: Miracle Mile CDO, Wilshire CPA, D Limitation' },
  { section: 'heading', text: '2. Top Strategy: AB 1287 (100% Density Bonus)' },
  { section: 'body', text: '✓ Max units: 72 (base 36 × 2.0 bonus)' },
  { section: 'body', text: '✓ FAR: 6.0 | Buildable: 87,500 sf' },
  { section: 'body', text: '✓ Affordability: 11% VLI (8 units deed-restricted)' },
  { section: 'heading', text: '3. Alternative: CHIP TOC Tier 3' },
  { section: 'body', text: '○ Max units: 65 (80% bonus) | FAR: 4.25' },
  { section: 'body', text: '○ Affordability: 8% ELI or 15% VLI' },
  { section: 'heading', text: '4. Parking & Setbacks' },
  { section: 'body', text: 'Parking: 0.5/unit (transit) = 36 spaces' },
  { section: 'body', text: 'Setbacks: 0 ft front (commercial), 5 ft rear reduced' },
  { section: 'heading', text: '5. Recommendation' },
  { section: 'highlight', text: 'PROCEED — AB 1287 yields highest unit count (72 units)' },
]

/* ═══════════════════════════════════════════════════════════
   AGENT CARD
   ═══════════════════════════════════════════════════════════ */

function AgentCard({
  agent,
  status,
  message,
  isActive,
  onClick,
}: {
  agent: Agent
  status: StepStatus
  message: string
  isActive: boolean
  onClick: () => void
}) {
  const Icon = agent.icon

  return (
    <motion.button
      layout
      onClick={onClick}
      className={cn(
        'relative flex items-start gap-3 w-full rounded-xl border p-3 sm:p-4 text-left transition-all duration-300 cursor-pointer',
        status === 'running'
          ? 'border-secondary/40 bg-secondary/[0.06] shadow-[0_0_20px_rgba(245,130,32,0.05)]'
          : status === 'done'
            ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
            : 'border-foreground/[0.08] bg-foreground/[0.02]',
        isActive && 'ring-1 ring-secondary/30',
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
          <span className={cn(
            'text-xs font-semibold tracking-tight',
            status === 'idle' ? 'text-foreground/40' : 'text-foreground',
          )}>
            {agent.name}
          </span>
          {status === 'running' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
          )}
        </div>
        <p className={cn(
          'text-[11px] leading-relaxed truncate',
          status === 'idle' ? 'text-foreground/25' : 'text-foreground/50',
        )}>
          {status === 'idle' ? 'Waiting…' : message}
        </p>
      </div>
    </motion.button>
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
   REPORT PREVIEW (progressive reveal)
   ═══════════════════════════════════════════════════════════ */

function ReportPreview({ revealedLines, lines, pageCount }: { revealedLines: number; lines: typeof REPORT_LINES; pageCount: string }) {
  return (
    <div className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.03] overflow-hidden">
      {/* Doc toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-foreground/[0.08] bg-foreground/[0.02]">
        <FileTextIcon className="w-3.5 h-3.5 text-secondary/70" />
        <span className="text-[11px] font-medium text-foreground/60">feasibility-report.pdf</span>
        <span className="ml-auto text-[10px] text-foreground/30">{pageCount} pages</span>
      </div>

      {/* Doc content */}
      <div className="p-4 sm:p-5 space-y-1.5 font-mono text-[11px] leading-relaxed min-h-[280px] max-h-[320px] overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {lines.slice(0, revealedLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {line.section === 'header' && (
                <p className="text-foreground font-bold text-xs">{line.text}</p>
              )}
              {line.section === 'divider' && (
                <div className="border-b border-foreground/[0.08] my-2" />
              )}
              {line.section === 'heading' && (
                <p className="text-secondary/80 font-semibold mt-3 mb-0.5">{line.text}</p>
              )}
              {line.section === 'body' && (
                <p className="text-foreground/50 pl-2">{line.text}</p>
              )}
              {line.section === 'highlight' && (
                <p className="text-emerald-400 font-bold pl-2 mt-1">{line.text}</p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor */}
        {revealedLines < lines.length && revealedLines > 0 && (
          <motion.span
            className="inline-block w-1.5 h-3.5 bg-secondary/60 rounded-sm"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   LOG FEED (activity stream)
   ═══════════════════════════════════════════════════════════ */

function LogFeed({
  events,
  activeAgent,
  agentList,
}: {
  events: TimelineEvent[]
  activeAgent: AgentId | null
  agentList: Agent[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events.length])

  return (
    <div className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-foreground/[0.08] bg-foreground/[0.02]">
        <SparklesIcon className="w-3.5 h-3.5 text-secondary/70" />
        <span className="text-[11px] font-medium text-foreground/60">Agent Activity</span>
        <span className="ml-auto text-[10px] text-foreground/30">{events.length} events</span>
      </div>
      <div ref={scrollRef} className="p-3 max-h-[160px] overflow-y-auto space-y-1 scrollbar-thin">
        {events.map((evt, i) => {
          const agent = agentList.find(a => a.id === evt.agent)!
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex items-start gap-2 py-1 px-1.5 rounded text-[10px] transition-colors',
                activeAgent === evt.agent ? 'bg-foreground/[0.04]' : '',
              )}
            >
              <agent.icon className={cn('w-3 h-3 mt-0.5 shrink-0', agent.color, 'opacity-60')} />
              <span className="text-foreground/45 leading-snug">{evt.message}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN LIVE DEMO COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function LiveDemo({ variant = 'adu' }: { variant?: 'adu' | 'feasibility' }) {
  const isFeasibility = variant === 'feasibility'
  const demoAddress = isFeasibility ? FEASIBILITY_ADDRESS : DEMO_ADDRESS
  const agents = isFeasibility ? FEASIBILITY_AGENTS : AGENTS
  const timeline = isFeasibility ? FEASIBILITY_TIMELINE : TIMELINE
  const reportData = isFeasibility ? FEASIBILITY_REPORT_LINES : REPORT_LINES
  const completionText = isFeasibility
    ? '20-page report with 53 citations — 11 strategies evaluated'
    : '24-page report with 47 citations generated'

  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: '-100px' })

  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [activeAgent, setActiveAgent] = useState<AgentId | null>(null)
  const [agentStates, setAgentStates] = useState<Record<AgentId, { status: StepStatus; message: string }>>({
    zoning: { status: 'idle', message: '' },
    code: { status: 'idle', message: '' },
    plan: { status: 'idle', message: '' },
    feasibility: { status: 'idle', message: '' },
    report: { status: 'idle', message: '' },
  })
  const [visibleEvents, setVisibleEvents] = useState<TimelineEvent[]>([])
  const [reportLines, setReportLines] = useState(0)
  const [complete, setComplete] = useState(false)

  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  // Auto-start when scrolled into view
  useEffect(() => {
    if (isInView && !started) {
      const timer = setTimeout(() => setStarted(true), 600)
      return () => clearTimeout(timer)
    }
  }, [isInView, started])

  // Animation loop
  const tick = useCallback(() => {
    const now = performance.now()
    const dt = now - startTimeRef.current
    setElapsed(dt)

    // Process timeline events
    const due = timeline.filter(e => e.time <= dt)
    if (due.length > 0) {
      const newStates = { ...agentStates }
      const newEvents: TimelineEvent[] = []

      for (const evt of due) {
        if (!visibleEvents.find((v, i) => v.time === evt.time && v.agent === evt.agent && v.message === evt.message)) {
          newEvents.push(evt)
        }
        newStates[evt.agent] = { status: evt.status, message: evt.message }
      }

      if (newEvents.length > 0) {
        setVisibleEvents(prev => {
          const seen = new Set(prev.map(e => `${e.time}-${e.agent}-${e.message}`))
          const fresh = newEvents.filter(e => !seen.has(`${e.time}-${e.agent}-${e.message}`))
          return [...prev, ...fresh]
        })
        setAgentStates(newStates)

        // Set active agent to last running
        const running = due.filter(e => e.status === 'running')
        if (running.length > 0) {
          setActiveAgent(running[running.length - 1].agent)
        }
      }
    }

    // Progressive report reveal (tied to report agent progress)
    const lastTime = timeline[timeline.length - 1].time
    const reportStart = timeline.find(e => e.agent === 'report')!.time
    if (dt > reportStart) {
      const reportProgress = Math.min((dt - reportStart) / (lastTime - reportStart + 1000), 1)
      setReportLines(Math.floor(reportProgress * reportData.length))
    }

    // Check completion
    if (dt >= lastTime + 1500) {
      setComplete(true)
      setActiveAgent(null)
      setReportLines(reportData.length)
      return // stop loop
    }

    rafRef.current = requestAnimationFrame(tick)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (started) {
      startTimeRef.current = performance.now()
      rafRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(rafRef.current)
    }
  }, [started, tick])

  // Restart
  function handleRestart() {
    setStarted(false)
    setElapsed(0)
    setActiveAgent(null)
    setAgentStates({
      zoning: { status: 'idle', message: '' },
      code: { status: 'idle', message: '' },
      plan: { status: 'idle', message: '' },
      feasibility: { status: 'idle', message: '' },
      report: { status: 'idle', message: '' },
    })
    setVisibleEvents([])
    setReportLines(0)
    setComplete(false)
    // re-trigger after a beat
    setTimeout(() => setStarted(true), 400)
  }

  // Fake progress bar
  const lastTime = timeline[timeline.length - 1].time + 1500
  const progress = started ? Math.min(elapsed / lastTime, 1) : 0

  return (
    <div ref={containerRef} className="space-y-6">
      {/* ——— Address bar ——— */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 flex items-center gap-2 rounded-xl border border-foreground/[0.10] bg-foreground/[0.03] px-4 py-3 w-full">
          <MapPinIcon className="w-4 h-4 text-secondary/70 shrink-0" />
          <span className="text-sm text-foreground/70 truncate">{demoAddress}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!started ? (
            <button
              onClick={() => setStarted(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors"
            >
              <SparklesIcon className="w-4 h-4" />
              Run Analysis
            </button>
          ) : complete ? (
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-secondary/30 bg-secondary/10 text-secondary text-sm font-semibold hover:bg-secondary/20 transition-colors"
            >
              <ArrowRightIcon className="w-4 h-4" />
              Run Again
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/50">
              <Loader2Icon className="w-4 h-4 animate-spin text-secondary" />
              Analyzing…
            </div>
          )}
        </div>
      </div>

      {/* ——— Progress bar ——— */}
      <div className="relative h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-secondary to-emerald-400"
          initial={{ width: '0%' }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
      </div>

      {/* ——— Main grid: agents + report ——— */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Left: Agent cards */}
        <div className="space-y-0">
          {agents.map((agent, i) => (
            <div key={agent.id}>
              <AgentCard
                agent={agent}
                status={agentStates[agent.id].status}
                message={agentStates[agent.id].message}
                isActive={activeAgent === agent.id}
                onClick={() => setActiveAgent(agent.id)}
              />
              {i < agents.length - 1 && (
                <ConnectionDot active={agentStates[agents[i + 1].id].status !== 'idle'} />
              )}
            </div>
          ))}
        </div>

        {/* Right: Report preview + log */}
        <div className="space-y-4 min-h-0 overflow-hidden">
          <ReportPreview revealedLines={reportLines} lines={reportData} pageCount={isFeasibility ? '20' : '24'} />
          <LogFeed events={visibleEvents} activeAgent={activeAgent} agentList={agents} />
        </div>
      </div>

      {/* ——— Completion state ——— */}
      <AnimatePresence>
        {complete && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2Icon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Analysis Complete</p>
                <p className="text-xs text-foreground/50">{completionText} in {(lastTime / 1000).toFixed(0)}s</p>
              </div>
            </div>
            <a
              href="/signup"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-secondary text-white text-sm font-semibold hover:bg-secondary/90 transition-colors shrink-0"
            >
              Try It Yourself
              <ChevronRightIcon className="w-4 h-4" />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
