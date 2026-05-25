'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PLATFORM_ACCESS_PLANS, getBillableRunPricing } from '@/lib/pricing'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import {
  ScrollReveal,
  MagneticWrap,
  SectionTag,
  TiltCard,
} from '@/components/landing/motion-primitives'
import {
  ArrowRightIcon,
  ScaleIcon,
  FileTextIcon,
  SearchIcon,
  PenToolIcon,
  PhoneIcon,
  SparklesIcon,
  BrainCircuitIcon,
  LayersIcon,
  EyeIcon,
  ActivityIcon,
  MapPinIcon,
  ShieldCheckIcon,
  CheckIcon,
  ZapIcon,
  BuildingIcon,
  CalculatorIcon,
} from 'lucide-react'

/* ——— Animation variants ——— */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] } },
}

/* ——— Counter ——— */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const dur = 2200
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 4)) * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

/* ═══════════════════════════════════════════════════════════
   HOME — PLATFORM HUB
   ═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isDark = !mounted || resolvedTheme === 'dark'
  const entryAccessPlan = PLATFORM_ACCESS_PLANS[0]
  const standardReportPricing = getBillableRunPricing('feasibility-analysis')
  const strategyReportPricing = getBillableRunPricing('feasibility-analysis', 'strategy')

  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroOpacity = useTransform(heroProgress, [0, 0.6], [1, 0])
  const heroScale = useTransform(heroProgress, [0, 0.6], [1, 0.97])
  const heroY = useTransform(heroProgress, [0, 1], [0, 60])
  const smoothHeroY = useSpring(heroY, { stiffness: 80, damping: 25 })

  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="relative bg-background overflow-x-clip">
      <SiteHeader />

      {/* ══════════════════ HERO ══════════════════ */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <motion.div
            className="absolute w-[800px] h-[800px] rounded-full blur-3xl opacity-50"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(245,130,32,0.15) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(245,130,32,0.1) 0%, transparent 60%)',
              top: '-10%', left: '-10%',
            }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-50"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)',
              bottom: '-10%', right: '-5%',
            }}
            animate={{ x: [0, -30, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          aria-hidden="true"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: smoothHeroY }}
          className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center"
        >
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp}>
              <Badge
                variant="outline"
                className="mb-6 py-1.5 px-4 border-secondary/20 bg-secondary/[0.06] text-secondary text-xs font-medium tracking-wide"
              >
                <SparklesIcon className="w-3 h-3 mr-1.5" />
                AI-Powered Permit Intelligence
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-foreground tracking-tight leading-[1.05]"
            >
              Your permits.
              <br />
              <span className="bg-gradient-to-r from-secondary via-amber-400 to-violet-400 bg-clip-text text-transparent">
                Weeks faster.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-foreground/50 max-w-2xl mx-auto mt-6 leading-relaxed"
            >
              From <strong className="text-foreground/70">feasibility analysis</strong> to{' '}
              <strong className="text-foreground/70">corrections response</strong>,{' '}
              <strong className="text-foreground/70">plan review</strong> to{' '}
              <strong className="text-foreground/70">permit creation</strong> — powered by specialized AI agents
              that know California housing code inside and out.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Link href="/pricing" className="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1 text-sm text-foreground/60 hover:text-foreground transition-colors">
                {entryAccessPlan.priceDisplay} platform access
              </Link>
              <Link href="/pricing" className="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1 text-sm text-foreground/60 hover:text-foreground transition-colors">
                ${standardReportPricing.priceUsdCents / 100} standard report
              </Link>
              <Link href="/pricing" className="inline-flex items-center rounded-full border border-foreground/10 bg-foreground/[0.04] px-3 py-1 text-sm text-foreground/60 hover:text-foreground transition-colors">
                ${strategyReportPricing.priceUsdCents / 100} strategy report
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
              <MagneticWrap strength={0.12}>
                <Link href="/feasibility">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold bg-secondary hover:bg-secondary/90 text-white shadow-[0_0_40px_rgba(245,130,32,0.3)] hover:shadow-[0_0_60px_rgba(245,130,32,0.5)] transition-all duration-300 rounded-xl"
                  >
                    Feasibility Analysis
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </MagneticWrap>
              <MagneticWrap strength={0.12}>
                <Link href="/adu">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold border-foreground/10 text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-300 rounded-xl"
                  >
                    ADU Permit Review
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </MagneticWrap>
            </motion.div>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-20" />
      </section>

      {/* ══════════════════ STATS RIBBON ══════════════════ */}
      <section className="relative z-30 -mt-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-foreground/[0.10] bg-foreground/[0.05] backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]"
          >
            {[
              { val: 429503, suffix: '', label: 'ADU permits in CA since 2018' },
              { val: 90, suffix: '%+', label: 'Require corrections first time' },
              { val: 8, suffix: ' min', label: 'Average AI analysis time' },
              { val: 480, suffix: '+', label: 'California cities covered' },
            ].map(stat => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                className="flex flex-col items-center justify-center py-8 px-4 text-center border-r border-b border-foreground/[0.08] last:border-r-0 [&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r"
              >
                <span className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  <Counter target={stat.val} suffix={stat.suffix} />
                </span>
                <span className="text-[11px] text-foreground/50 mt-1 font-medium leading-tight">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ TWO PLATFORMS ══════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-28 sm:py-36">
        <ScrollReveal className="text-center mb-16">
          <SectionTag>Two Platforms</SectionTag>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
            One system.{' '}
            <span className="text-secondary">Every workflow.</span>
          </h2>
          <p className="text-foreground/50 text-base max-w-2xl mx-auto mt-4 leading-relaxed">
            Whether you need to know what you <em>can</em> build or you need to fix what you&apos;ve <em>already</em> submitted —
            FeasiAI covers both sides of the permit lifecycle.
          </p>
        </ScrollReveal>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid gap-6 lg:grid-cols-2"
          >
            {/* Feasibility Card */}
            <motion.div variants={fadeUp}>
              <TiltCard className="h-full">
                <Link href="/feasibility" className="block group h-full">
                  <div className="relative rounded-2xl border border-violet-500/20 bg-foreground/[0.04] hover:bg-foreground/[0.07] hover:border-violet-500/30 transition-all duration-500 h-full overflow-hidden shadow-lg hover:shadow-violet-500/10">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(139,92,246,0.06) 0%, transparent 60%)' }} />
                    <div className="relative p-8 sm:p-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <ScaleIcon className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground tracking-tight">Feasibility Analysis</h3>
                          <p className="text-xs text-foreground/40">Multi-strategy property development intelligence</p>
                        </div>
                      </div>

                      <p className="text-sm text-foreground/50 leading-relaxed mb-6">
                        Type an address. Get a professional 20-page report evaluating <strong className="text-foreground/70">11 entitlement strategies</strong> —
                        CHIP, TOC, AB&nbsp;1287, AB&nbsp;2334, SB&nbsp;79, AB&nbsp;2011 — with density bonus calculations, FAR, parking, setbacks,
                        and affordability requirements. What takes a consultant 1–2 weeks, delivered in ~8 minutes.
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {['CHIP/TOC/AHIP', 'AB 1287', 'AB 2334', 'SB 79', 'Density Bonus', '11 Strategies', '29 Reference Files'].map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-300/70 px-2 py-0.5 rounded-md border border-violet-500/15 bg-violet-500/[0.06]">
                            <CheckIcon className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 group-hover:text-violet-300 transition-colors">
                        Explore Feasibility
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </TiltCard>
            </motion.div>

            {/* ADU Permits Card */}
            <motion.div variants={fadeUp}>
              <TiltCard className="h-full">
                <Link href="/adu" className="block group h-full">
                  <div className="relative rounded-2xl border border-secondary/20 bg-foreground/[0.04] hover:bg-foreground/[0.07] hover:border-secondary/30 transition-all duration-500 h-full overflow-hidden shadow-lg hover:shadow-secondary/10">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(245,130,32,0.06) 0%, transparent 60%)' }} />
                    <div className="relative p-8 sm:p-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-secondary/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FileTextIcon className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground tracking-tight">ADU Permit Review</h3>
                          <p className="text-xs text-foreground/40">Corrections analysis, plan review & response letters</p>
                        </div>
                      </div>

                      <p className="text-sm text-foreground/50 leading-relaxed mb-6">
                        Upload a corrections letter and plan set. AI agents parse every item, cross-reference <strong className="text-foreground/70">state and city code</strong>,
                        and generate a professional response letter with exact citations. Pre-screen plans against <strong className="text-foreground/70">480+ California cities</strong> before submission.
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {['Corrections Response', 'Plan Review', 'City Code Research', 'Response Letters', '7,400px Vision', '480+ Cities'].map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-secondary/70 px-2 py-0.5 rounded-md border border-secondary/15 bg-secondary/[0.06]">
                            <CheckIcon className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-secondary group-hover:text-secondary/80 transition-colors">
                        Explore ADU Permits
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </TiltCard>
            </motion.div>
          </motion.div>
      </section>

      {/* ══════════════════ ALL WORKFLOWS ══════════════════ */}
      <section className="relative z-10 py-28 sm:py-36">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-16">
            <SectionTag>Four Workflows</SectionTag>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Powered by{' '}
              <span className="text-secondary">specialized AI agents</span>
            </h2>
          </ScrollReveal>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                icon: ScaleIcon,
                color: 'violet',
                title: 'Feasibility Analysis',
                desc: '11 entitlement strategies evaluated simultaneously. CHIP, TOC, density bonus, FAR, parking, setbacks — one address in, 20-page report out.',
                href: '/feasibility',
              },
              {
                icon: FileTextIcon,
                color: 'secondary',
                title: 'Corrections Response',
                desc: 'Upload a corrections letter and plans. AI parses every item, cites exact code sections, and generates a professional response letter.',
                href: '/adu',
              },
              {
                icon: SearchIcon,
                color: 'blue',
                title: 'City Plan Review',
                desc: 'Pre-screen plans against state + city code. Catch compliance issues sheet-by-sheet before you submit to the building department.',
                href: '/adu',
              },
              {
                icon: PenToolIcon,
                color: 'emerald',
                title: 'Permit Set Creation',
                desc: 'AI-assisted generation of permit-ready document sets. Title 24, structural details — assembled and formatted for city submission.',
                href: '/adu',
              },
            ].map(item => {
              const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
                violet: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'group-hover:border-violet-500/25', glow: 'rgba(139,92,246,0.06)' },
                secondary: { bg: 'bg-secondary/15', text: 'text-secondary', border: 'group-hover:border-secondary/25', glow: 'rgba(245,130,32,0.06)' },
                blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'group-hover:border-blue-500/25', glow: 'rgba(59,130,246,0.06)' },
                emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'group-hover:border-emerald-500/25', glow: 'rgba(16,185,129,0.06)' },
              }
              const c = colorMap[item.color] || colorMap.secondary
              return (
                <motion.div key={item.title} variants={fadeUp}>
                  <TiltCard className="h-full">
                    <Link href={item.href} className="block h-full">
                      <div className={`group relative rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] ${c.border} hover:bg-foreground/[0.07] transition-all duration-500 h-full overflow-hidden shadow-md hover:shadow-lg`}>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `radial-gradient(ellipse at 30% 20%, ${c.glow} 0%, transparent 60%)` }} />
                        <div className="relative p-6">
                          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <item.icon className={`w-[18px] h-[18px] ${c.text}`} />
                          </div>
                          <h3 className="text-base font-semibold text-foreground tracking-tight mb-2">{item.title}</h3>
                          <p className="text-[13px] text-foreground/50 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    </Link>
                  </TiltCard>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ WHY THIS WORKS ══════════════════ */}
      <section className="relative z-10 py-28 sm:py-36 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full opacity-[0.06]" style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(245,130,32,0.6)' : 'rgba(245,130,32,0.3)'} 0%, transparent 60%)` }} aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-16">
            <SectionTag>Our Approach</SectionTag>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Why this{' '}
              <span className="text-secondary">actually works</span>
            </h2>
            <p className="text-foreground/50 text-base max-w-2xl mx-auto mt-4 leading-relaxed">
              Most AI tools give you a chatbot. We built a multi-agent system that replicates how the best permit consultants think — with every California code baked in.
            </p>
          </ScrollReveal>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              { icon: BrainCircuitIcon, title: 'Multi-Agent AI Pipeline', desc: 'Not one model — a team of specialized agents. Each task is researched, verified against code, and cross-checked.' },
              { icon: LayersIcon, title: '29+ Reference Files', desc: 'Full California ADU Handbook, CHIP ordinance, HCD standards, Title 24, LAMC — structured so agents cite exact sections.' },
              { icon: EyeIcon, title: 'Full-Resolution Vision', desc: 'Plans analyzed at 7,400px+ native resolution. Every dimension, note, and detail — the way a plan checker reviews.' },
              { icon: MapPinIcon, title: '480+ City-Specific Rules', desc: "Every CA city has unique ordinances. Our system researches each city's code via web search, extraction, and browser fallback." },
              { icon: CalculatorIcon, title: 'Real Ordinance Math', desc: 'Density formulas, FAR calculations, MARD rounding rules — built from the actual CHIP Ordinance 188,477 and Gov Code §65915.' },
              { icon: ShieldCheckIcon, title: 'Submission-Ready Output', desc: 'Response letters with proper citations, formatted for city reviewers. Feasibility reports with strategy comparison. Ready as-is.' },
            ].map(item => (
              <motion.div key={item.title} variants={fadeUp}>
                <TiltCard className="h-full">
                  <div className="group rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] p-6 hover:bg-foreground/[0.07] hover:border-foreground/[0.16] transition-all duration-500 h-full shadow-sm hover:shadow-md">
                    <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] border border-foreground/[0.10] flex items-center justify-center mb-4 group-hover:bg-secondary/10 group-hover:border-secondary/20 transition-colors duration-300">
                      <item.icon className="w-[18px] h-[18px] text-foreground/60 group-hover:text-secondary transition-colors duration-300" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-foreground tracking-tight mb-2">{item.title}</h3>
                    <p className="text-[13px] text-foreground/50 leading-relaxed">{item.desc}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ TECHNOLOGY ══════════════════ */}
      <section className="relative z-10 py-28 sm:py-36">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-14">
            <SectionTag>Under the Hood</SectionTag>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Built for{' '}
              <span className="text-secondary">production</span>
            </h2>
          </ScrollReveal>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid gap-4 grid-cols-2 lg:grid-cols-4"
          >
            {[
              { title: '29 Reference Files', desc: 'California code + CHIP ordinance encoded as structured knowledge', icon: LayersIcon, num: '29' },
              { title: '3 Research Modes', desc: 'Web search, targeted extraction, browser fallback', icon: SearchIcon, num: '3' },
              { title: '7,400px+ Vision', desc: 'Construction plans at native full resolution', icon: EyeIcon, num: '7.4K' },
              { title: 'Real-Time Tracking', desc: 'Live progress via Supabase Realtime', icon: ActivityIcon, num: 'Live' },
            ].map(item => (
              <motion.div key={item.title} variants={fadeUp}>
                <div className="group relative rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] p-5 sm:p-6 hover:bg-foreground/[0.07] hover:border-foreground/[0.18] transition-all duration-500 h-full overflow-hidden">
                  <span className="absolute -top-2 -right-1 text-[4rem] font-black text-foreground/[0.04] select-none leading-none group-hover:text-foreground/[0.07] transition-colors duration-500">{item.num}</span>
                  <div className="relative">
                    <item.icon className="w-5 h-5 text-secondary/70 mb-3" />
                    <h3 className="font-semibold text-sm text-foreground mb-1">{item.title}</h3>
                    <p className="text-xs text-foreground/50 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ SERVICES ══════════════════ */}
      <section className="relative z-10 py-20 sm:py-28">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal>
            <div className="relative rounded-3xl border border-foreground/[0.10] bg-foreground/[0.04] backdrop-blur-sm overflow-hidden">
              <div className="grid md:grid-cols-2">
                <div className="p-8 sm:p-12 space-y-6">
                  <Image
                    src="/images/feasiai-icon.svg"
                    alt="FeasiAI"
                    width={180}
                    height={45}
                    className={`h-8 w-auto ${isDark ? 'brightness-0 invert opacity-80' : 'opacity-90'}`}
                  />
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
                    Expert Entitlements &amp;
                    <br />
                    Permit Expediting
                  </h2>
                  <p className="text-sm text-foreground/50 leading-relaxed">
                    FeasiAI is built by FeasiAI — serving developers, architects,
                    and property owners across Los Angeles, Austin, and Miami since 2018.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Land Use', 'Entitlements', 'Permit Expediting', 'Feasibility', 'CHIP/AHIP', 'Due Diligence'].map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-md border border-foreground/[0.12] bg-foreground/[0.05] text-[11px] font-medium text-foreground/55">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <a href="https://feasiai.com/services/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors group/link">
                    Explore Our Services
                    <ArrowRightIcon className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                  </a>
                </div>
                <div className="border-t md:border-t-0 md:border-l border-foreground/[0.10] p-8 sm:p-12 flex flex-col justify-center space-y-6 bg-foreground/[0.02]">
                  {[
                    { num: '358+', label: 'Completed feasibility reports' },
                    { num: '4,000+', label: 'Housing units approved across LA, Austin & Miami' },
                    { num: '2018', label: 'Helping developers navigate zoning & city processes' },
                  ].map(stat => (
                    <div key={stat.num} className="flex flex-col">
                      <span className="text-3xl font-extrabold text-secondary tracking-tight">{stat.num}</span>
                      <span className="text-[13px] text-foreground/50 mt-1">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════ CTA ══════════════════ */}
      <section className="relative z-10 py-28 sm:py-36 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <motion.div
            className="w-[50vw] h-[50vw] rounded-full"
            style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(245,130,32,0.12)' : 'rgba(245,130,32,0.06)'} 0%, transparent 60%)` }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] font-extrabold text-foreground tracking-tight leading-[1.08]">
              Ready to accelerate
              <br />
              your permits?
            </h2>
            <p className="text-base text-foreground/45 max-w-md mx-auto mt-5 leading-relaxed">
              Join developers and architects who trust FeasiAI to navigate zoning,
              entitlements, and permit approvals.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
              <MagneticWrap strength={0.12}>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold bg-secondary hover:bg-secondary/90 text-white shadow-[0_0_40px_rgba(245,130,32,0.3)] hover:shadow-[0_0_60px_rgba(245,130,32,0.5)] transition-all duration-300 rounded-xl"
                  >
                    See Pricing & Plans
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </MagneticWrap>
              <MagneticWrap strength={0.12}>
                <a href="tel:8187935058">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold border-foreground/10 text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] hover:border-foreground/20 transition-all duration-300 rounded-xl"
                  >
                    <PhoneIcon className="w-4 h-4 mr-2" />
                    (818) 793-5058
                  </Button>
                </a>
              </MagneticWrap>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
