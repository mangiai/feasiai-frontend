'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { DotGrid } from '@/components/landing/dot-grid'
import { LiveDemo } from '@/components/landing/live-demo'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import {
  ScrollReveal,
  MagneticWrap,
  SectionTag,
} from '@/components/landing/motion-primitives'
import {
  FileTextIcon,
  SearchIcon,
  ArrowRightIcon,
  ScaleIcon,
  MapPinIcon,
  PhoneIcon,
  LayersIcon,
  EyeIcon,
  ActivityIcon,
  PenToolIcon,
  BrainCircuitIcon,
  BookOpenIcon,
  ScanEyeIcon,
  MessageSquareIcon,
  ShieldIcon,
  ArrowUpRightIcon,
  CheckIcon,
} from 'lucide-react'

/* ——— Stagger container for children ——— */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}
const fadeChild = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  },
}

/* ——— Animated counter ——— */
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
   LANDING PAGE
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroOpacity = useTransform(heroProgress, [0, 0.7], [1, 0])
  const heroScale = useTransform(heroProgress, [0, 0.7], [1, 0.96])
  const heroY = useTransform(heroProgress, [0, 1], [0, 80])
  const smoothHeroY = useSpring(heroY, { stiffness: 80, damping: 25 })

  return (
    <div className="relative bg-background overflow-x-hidden">
      <SiteHeader />

      {/* ══════════════════ HERO ══════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Interactive dot grid */}
        <DotGrid
          dotColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.1)'}
          dotSize={1}
          gap={28}
          mouseRadius={150}
          mouseStrength={0.8}
          className="z-0"
        />

        {/* Ambient gradient blobs */}
        <div className="absolute inset-0 z-[1]" aria-hidden="true">
          <motion.div
            className="absolute w-[60vw] h-[60vw] -top-[20%] -left-[15%] rounded-full"
            style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(27,42,95,0.5)' : 'rgba(27,42,95,0.08)'} 0%, transparent 65%)` }}
            animate={{ x: [0, 50, 0], y: [0, -40, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[45vw] h-[45vw] bottom-[-10%] right-[-8%] rounded-full"
            style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(245,130,32,0.35)' : 'rgba(245,130,32,0.08)'} 0%, transparent 65%)` }}
            animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[30vw] h-[30vw] top-[35%] right-[10%] rounded-full"
            style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.06)'} 0%, transparent 60%)` }}
            animate={{ x: [0, 25, 0], y: [0, -20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Content */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: smoothHeroY }}
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center pt-32 pb-28"
        >
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            {/* Tag */}
            <motion.div variants={fadeChild} className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-secondary/20 bg-secondary/[0.06] backdrop-blur-sm text-xs font-medium tracking-wider text-secondary">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" /></span>
                Now in Early Access
              </div>
            </motion.div>

            {/* Headline */}
            <motion.div variants={fadeChild} className="mt-10">
              <h1 className="text-[clamp(2.2rem,6vw,4.5rem)] font-extrabold text-foreground leading-[1.05] tracking-[-0.035em]">
                Your permits.
                <br />
                <span className="bg-gradient-to-r from-secondary via-amber-400 to-secondary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
                  Weeks faster.
                </span>
              </h1>
            </motion.div>

            {/* Sub */}
            <motion.p variants={fadeChild} className="text-lg sm:text-xl text-foreground/40 max-w-xl mx-auto mt-7 leading-relaxed font-medium">
              AI agents that read plans, cite code, and write
              response letters — so you don&apos;t have to.
            </motion.p>

            {/* Markers */}
            <motion.div variants={fadeChild} className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-10">
              {[
                '480+ California cities',
                '28 code files indexed',
                '15 min avg. turnaround',
              ].map(text => (
                <span key={text} className="flex items-center gap-2 text-[13px] text-foreground/25 font-medium">
                  <span className="w-1 h-1 rounded-full bg-secondary shadow-[0_0_8px_rgba(245,130,32,0.7)]" />
                  {text}
                </span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeChild} className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
              <MagneticWrap strength={0.12}>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-8 font-semibold text-white bg-secondary hover:bg-secondary/90 shadow-[0_0_30px_rgba(245,130,32,0.3)] hover:shadow-[0_0_48px_rgba(245,130,32,0.5)] transition-all duration-300"
                  >
                    Start Your Review
                    <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </MagneticWrap>
              <MagneticWrap strength={0.12}>
                <a href="https://feasiai.com/book-consultation" target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-8 font-semibold border-foreground/10 text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] hover:border-foreground/20 bg-foreground/[0.02] backdrop-blur-sm transition-all duration-300"
                  >
                    Book a Consultation
                  </Button>
                </a>
              </MagneticWrap>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent z-20" />
      </section>

      {/* ══════════════════ STATS RIBBON ══════════════════ */}
      <section className="relative z-30 -mt-8">
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
              { val: 15, suffix: ' min', label: 'Average AI analysis time' },
              { val: 480, suffix: '+', label: 'California cities covered' },
            ].map(stat => (
              <motion.div
                key={stat.label}
                variants={fadeChild}
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

      {/* ══════════════════ FEATURES — BENTO ══════════════════ */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-28 sm:py-36">
        <ScrollReveal className="text-center mb-16">
          <SectionTag>Four Workflows</SectionTag>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
            One platform.{' '}
            <span className="text-secondary">Every workflow.</span>
          </h2>
          <p className="text-foreground/50 text-base max-w-xl mx-auto mt-4 leading-relaxed">
            From corrections response to permit creation, city plan review to site feasibility — powered by specialized AI agents.
          </p>
        </ScrollReveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(220px,auto)]"
        >
          {/* Card 1 — large */}
          <motion.div variants={fadeChild} className="sm:col-span-2 lg:col-span-2 lg:row-span-2">
            <BentoCard
              icon={FileTextIcon}
              accent="secondary"
              title="Corrections Analysis"
              desc="Upload a corrections letter and plan set. AI parses every item, cross-references state and city code, and generates a professional response letter with exact citations."
              tags={['Code references', 'Response letter', 'Contractor Q&A']}
              featured
            />
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={fadeChild} className="sm:col-span-1 lg:col-span-2">
            <BentoCard
              icon={PenToolIcon}
              accent="emerald"
              title="Permit Set Creation"
              desc="AI-assisted generation of complete permit-ready document sets. Title 24, structural details — assembled for submission."
              tags={['Document assembly', 'Code-compliant', 'City formatting']}
            />
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={fadeChild}>
            <BentoCard
              icon={SearchIcon}
              accent="blue"
              title="City Plan Review"
              desc="Pre-screen against state + city code. Catch compliance issues before plan check."
              tags={['Sheet-by-sheet', 'Draft corrections']}
            />
          </motion.div>

          {/* Card 4 — Feasibility (now links to dedicated page) */}
          <motion.div variants={fadeChild}>
            <Link href="/feasibility" className="block h-full">
              <BentoCard
                icon={ScaleIcon}
                accent="violet"
                title="Feasibility Analysis"
                desc="11 entitlement strategies — CHIP, TOC, AB 1287, SB 79, AB 2011. Type an address, get a 20-page report."
                tags={['CHIP/AHIP/TOC', '11 strategies', 'Learn more →']}
              />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section id="process" className="relative z-10 py-28 sm:py-36">
        {/* Gradient separator */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-16">
            <SectionTag>Simple Process</SectionTag>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Three steps to{' '}
              <span className="text-secondary">faster permits</span>
            </h2>
          </ScrollReveal>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-4 max-w-5xl mx-auto">
            {[
              {
                num: '01',
                title: 'Upload Documents',
                desc: 'Plan binder, corrections letter, or site address. Full-resolution PDFs analyzed at 7,400px+ native quality.',
              },
              {
                num: '02',
                title: 'AI Agents Analyze',
                desc: 'Specialized agents parse documents against 28 files of California code and city-specific municipal codes.',
              },
              {
                num: '03',
                title: 'Get Results',
                desc: 'Professional response letters, corrections analyses, feasibility reports. Download as PDF or review in-app.',
              },
            ].map((step, i) => (
              <ScrollReveal key={step.num} delay={i * 0.12} className="h-full">
                <div className="relative group h-full">
                  {/* Connecting line */}
                  {i < 2 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(100%)] w-full h-px bg-gradient-to-r from-foreground/10 to-transparent z-0" />
                  )}
                  <div className="relative rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] backdrop-blur-sm p-8 hover:bg-foreground/[0.07] hover:border-foreground/[0.18] transition-all duration-500 h-full flex flex-col">
                    <span className="text-5xl font-black text-foreground/[0.06] absolute top-4 right-6 select-none">{step.num}</span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center mb-5 shrink-0">
                      <span className="text-sm font-bold text-secondary">{step.num}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight mb-2 shrink-0">{step.title}</h3>
                    <p className="text-[13px] text-foreground/50 leading-relaxed flex-1">{step.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ LIVE DEMO ══════════════════ */}
      <section id="demo" className="relative z-10 py-28 sm:py-36">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-14">
            <SectionTag>Live Demo</SectionTag>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Watch the AI{' '}
              <span className="text-secondary">in action</span>
            </h2>
            <p className="text-foreground/50 text-base max-w-2xl mx-auto mt-4 leading-relaxed">
              See how five specialized agents collaborate to produce a full feasibility report — from address lookup to final document, in seconds.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="rounded-2xl border border-foreground/[0.10] bg-foreground/[0.02] backdrop-blur-sm p-4 sm:p-6 lg:p-8">
              <LiveDemo />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════ WHY THIS WORKS ══════════════════ */}
      <section className="relative z-10 py-28 sm:py-36 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        {/* Ambient glow */}
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
              {
                icon: BrainCircuitIcon,
                title: 'Multi-Agent AI Pipeline',
                desc: 'Not one model — a team of specialized agents. Each correction item is researched, verified against code, and cross-checked.',
              },
              {
                icon: BookOpenIcon,
                title: '28 Files of CA Code',
                desc: 'Full California ADU Handbook, HCD standards, Title 24, fire/safety codes — structured so agents cite exact sections.',
              },
              {
                icon: ScanEyeIcon,
                title: 'Full-Resolution Vision',
                desc: 'Plans analyzed at 7,400px+ native resolution. Every dimension, note, and detail on your sheets — the way a plan checker reviews.',
              },
              {
                icon: MapPinIcon,
                title: '480+ City-Specific Rules',
                desc: 'Every CA city has unique ordinances. Our system researches each city\'s code via web search, extraction, and browser fallback.',
              },
              {
                icon: MessageSquareIcon,
                title: 'Human-in-the-Loop Q&A',
                desc: 'Before final outputs, the system asks contractors targeted questions. No guessing — verified facts lead to accurate responses.',
              },
              {
                icon: ShieldIcon,
                title: 'Submission-Ready Output',
                desc: 'Response letters with proper citations, formatted for city reviewers. Feasibility reports with financial modeling. Ready as-is.',
              },
            ].map(item => (
              <motion.div key={item.title} variants={fadeChild}>
                <div className="group rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] p-6 hover:bg-foreground/[0.07] hover:border-foreground/[0.16] transition-all duration-500 h-full">
                  <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] border border-foreground/[0.10] flex items-center justify-center mb-4 group-hover:bg-secondary/10 group-hover:border-secondary/20 transition-colors duration-300">
                    <item.icon className="w-[18px] h-[18px] text-foreground/60 group-hover:text-secondary transition-colors duration-300" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight mb-2">{item.title}</h3>
                  <p className="text-[13px] text-foreground/50 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ TECHNOLOGY ══════════════════ */}
      <section id="technology" className="relative z-10 py-28 sm:py-36">
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
              { title: '28 Reference Files', desc: 'California ADU Handbook encoded as structured knowledge', icon: LayersIcon, num: '28' },
              { title: '3 Research Modes', desc: 'Web search, targeted extraction, browser fallback', icon: SearchIcon, num: '3' },
              { title: '7,400px+ Vision', desc: 'Construction plans at native full resolution', icon: EyeIcon, num: '7.4K' },
              { title: 'Real-Time Tracking', desc: 'Live progress via Supabase Realtime', icon: ActivityIcon, num: 'Live' },
            ].map(item => (
              <motion.div key={item.title} variants={fadeChild}>
                <div className="group relative rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] p-5 sm:p-6 hover:bg-foreground/[0.07] hover:border-foreground/[0.18] transition-all duration-500 h-full overflow-hidden">
                  {/* Large background number */}
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
                    {['Land Use', 'Entitlements', 'Permit Expediting', 'Permit Creation', 'Feasibility', 'CHIP/AHIP', 'Due Diligence'].map(tag => (
                      <span key={tag} className="px-2.5 py-1 rounded-md border border-foreground/[0.12] bg-foreground/[0.05] text-[11px] font-medium text-foreground/55">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <a href="https://feasiai.com/services/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors group/link">
                    Explore Our Services
                    <ArrowUpRightIcon className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
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

        {/* Big radial glow */}
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
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold border-foreground/10 text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] hover:border-foreground/20 bg-foreground/[0.02] transition-all duration-300 rounded-xl"
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

/* ══════════════════════════════════════════════════════════
   BENTO CARD
   ══════════════════════════════════════════════════════════ */
function BentoCard({
  icon: Icon,
  accent,
  title,
  desc,
  tags,
  featured = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  accent: string
  title: string
  desc: string
  tags: string[]
  featured?: boolean
}) {
  const accentMap: Record<string, { bg: string; text: string; border: string }> = {
    secondary: { bg: 'bg-secondary/15', text: 'text-secondary', border: 'group-hover:border-secondary/25' },
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'group-hover:border-emerald-500/25' },
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'group-hover:border-blue-500/25' },
    violet: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'group-hover:border-violet-500/25' },
  }
  const a = accentMap[accent] || accentMap.secondary

  return (
    <div className={`group relative rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] ${a.border} hover:bg-foreground/[0.07] transition-all duration-500 h-full overflow-hidden flex flex-col`}>
      {/* Hover gradient shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `radial-gradient(ellipse at 30% 20%, ${accent === 'secondary' ? 'rgba(245,130,32,0.06)' : accent === 'emerald' ? 'rgba(16,185,129,0.06)' : accent === 'blue' ? 'rgba(59,130,246,0.06)' : 'rgba(139,92,246,0.06)'} 0%, transparent 60%)` }} />

      <div className={`relative p-6 ${featured ? 'sm:p-8' : 'sm:p-6'} flex flex-col flex-1`}>
        <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
          <Icon className={`w-[18px] h-[18px] ${a.text}`} />
        </div>
        <h3 className={`${featured ? 'text-xl' : 'text-base'} font-semibold text-foreground tracking-tight mb-2`}>
          {title}
        </h3>
        <p className={`${featured ? 'text-sm' : 'text-[13px]'} text-foreground/50 leading-relaxed mb-4 flex-1`}>
          {desc}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/45 px-2 py-0.5 rounded-md border border-foreground/[0.10] bg-foreground/[0.04]">
              <CheckIcon className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
