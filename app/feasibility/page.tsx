'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MobileNav } from '@/components/mobile-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  ScrollReveal,
  MagneticWrap,
  SectionTag,
} from '@/components/landing/motion-primitives'
import { LiveDemo } from '@/components/landing/live-demo'
import {
  ArrowRightIcon,
  MapPinIcon,
  PhoneIcon,
  BuildingIcon,
  ScaleIcon,
  TreesIcon,
  TrainFrontIcon,
  ShieldCheckIcon,
  CalculatorIcon,
  ClockIcon,
  FileTextIcon,
  LayersIcon,
  ZapIcon,
  SearchIcon,
  GlobeIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  MailIcon,
  SparklesIcon,
  BrainCircuitIcon,
} from 'lucide-react'

/* ——— Stagger container ——— */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] } },
}
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] } },
}

/* ——— Animated counter ——— */
function Counter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const dur = 2000
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 4)) * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target])
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>
}

/* ——— Strategy data ——— */
const STRATEGIES = [
  { id: 'S1', name: 'By-Right', desc: 'Base zoning — what you can build today with no bonuses or incentives.', icon: BuildingIcon, color: 'slate' },
  { id: 'S2', name: 'AB 1287', desc: 'State 100% density bonus law — doubles your allowable units.', icon: LayersIcon, color: 'blue' },
  { id: 'S3', name: 'AB 2334', desc: 'Low VMT areas with unlimited density — no unit cap.', icon: ZapIcon, color: 'amber' },
  { id: 'S4', name: 'TOC / SDB', desc: 'CHIP Transit-Oriented Communities — up to 100% density bonus near transit.', icon: TrainFrontIcon, color: 'emerald' },
  { id: 'S5', name: 'CHIP TOIA', desc: 'Mixed-Income incentives with transit proximity bonuses.', icon: MapPinIcon, color: 'violet' },
  { id: 'S6', name: 'CHIP OC', desc: 'Mixed-Income Opportunity Corridors — targeted commercial corridor bonuses.', icon: GlobeIcon, color: 'rose' },
  { id: 'S7', name: 'CHIP AHIP', desc: '100% affordable housing — maximum incentive package available.', icon: ShieldCheckIcon, color: 'teal' },
  { id: 'S8', name: 'CHIP CT', desc: 'Community Transition area bonuses for qualifying neighborhoods.', icon: TreesIcon, color: 'lime' },
  { id: 'S9', name: 'ED 1', desc: 'Executive Directive (historical) — suspended since November 2025.', icon: ScaleIcon, color: 'gray' },
  { id: 'S10', name: 'SB 79', desc: 'Transit-oriented: FAR 2.50, 80 du/acre. Standalone — supersedes base zoning, cannot stack with CHIP or density bonuses.', icon: TrainFrontIcon, color: 'cyan' },
  { id: 'S11', name: 'AB 2011', desc: 'Ministerial housing on commercial sites — no discretionary review needed.', icon: FileTextIcon, color: 'orange' },
] as const

/* ——— Programs data ——— */
const PROGRAMS = [
  {
    name: 'CHIP',
    full: 'Citywide Housing Incentive Program',
    ordinance: 'Ordinance No. 188,477',
    effective: 'Feb 11, 2025',
    code: 'LAMC 12.22 A.37–A.39',
    url: 'https://planning.lacity.gov/plans-policies/citywide-housing-incentive-program',
    desc: "LA City's unified incentive framework replacing legacy TOC/density bonus. Three sub-programs: SDB/TOC (A.37), MIIP (A.38), AHIP (A.39).",
  },
  {
    name: 'State Density Bonus',
    full: 'California Government Code § 65915',
    ordinance: 'AB 1287 / AB 2334',
    effective: 'Ongoing',
    code: 'Gov. Code § 65915',
    url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=65915',
    desc: 'State law granting up to 100% density bonus for qualifying affordable housing. AB 1287 (100% bonus), AB 2334 (unlimited density in low VMT areas).',
  },
  {
    name: 'SB 79',
    full: 'Transit-Oriented Housing',
    ordinance: 'Senate Bill 79',
    effective: '2024',
    code: 'Gov. Code § 65913.5',
    url: 'https://planning.lacity.gov/plans-policies/citywide-housing-incentive-program',
    desc: 'Statewide transit-oriented development: FAR 2.50, 80 du/acre within ½ mile of major transit. Ministerial approval path.',
  },
  {
    name: 'AB 2011',
    full: 'Affordable Housing on Commercial Land',
    ordinance: 'Assembly Bill 2011',
    effective: '2023',
    code: 'Gov. Code § 65912.100',
    url: 'https://planning.lacity.gov/plans-policies/citywide-housing-incentive-program',
    desc: 'Build housing on commercial-zoned sites with ministerial (by-right) approval. No discretionary review, no CEQA. Major pathway for underused commercial corridors.',
  },
] as const

/* ——— Phase data ——— */
const PHASES = [
  {
    num: '01',
    title: 'Data Gathering',
    duration: '~2 min',
    desc: 'Three parallel agents pull property data from ZIMAS — zoning, lot dimensions, overlays, hazards, transit proximity, street classifications, and assessor records.',
    details: ['ZIMAS API integration', 'LA County Assessor data', 'Transit proximity calculation', 'Street dedication analysis'],
  },
  {
    num: '02',
    title: 'Strategy Evaluation',
    duration: '~4 min',
    desc: 'Nine+ strategy evaluators run simultaneously — computing density bonus, FAR, affordability thresholds, setback reductions, parking relief, and unit mix for every applicable program.',
    details: ['Density bonus formulas', 'FAR calculations', 'Affordability thresholds', 'Parking & setback relief'],
  },
  {
    num: '03',
    title: 'Report Generation',
    duration: '~2 min',
    desc: 'Final assembly produces a professional 20-page feasibility report comparing all viable strategies with unit counts, buildable area, and development recommendations.',
    details: ['Strategy comparison matrix', 'Unit mix optimization', 'Financial modeling', 'PDF export ready'],
  },
] as const

/* ——— Source citations ——— */
const SOURCES = [
  { label: 'CHIP Official Page', url: 'https://planning.lacity.gov/plans-policies/citywide-housing-incentive-program' },
  { label: 'CHIP Procedures & Resources', url: 'https://planning.lacity.gov/odocument/28328299-7817-4ba0-8deb-e1c84b338dca/CHIP_ProceduresResources_Final.pdf' },
  { label: 'CHIP Decision Tree Flowchart', url: 'https://planning.lacity.gov/odocument/073b0daa-e1e7-45ca-a2b9-74f1fcfa4676/202505_CHIP_DecisionTree_Flowchart_Final.pdf' },
  { label: 'MARD Calculation Guide', url: 'https://planning.lacity.gov/odocument/e6ecee12-f5a8-400f-af51-b2749c254f67/MARD_FD.pdf' },
  { label: 'CA Gov Code § 65915', url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=65915' },
  { label: 'ZIMAS — Zoning Info & Map Access', url: 'https://zimas.lacity.org' },
  { label: 'LA Zoning Code', url: 'https://planning.lacity.gov/resources/zoning-code' },
] as const

/* ═══════════════════════════════════════════════════════════
   FEASIBILITY LANDING PAGE
   ═══════════════════════════════════════════════════════════ */
export default function FeasibilityPage() {
  const [scrolled, setScrolled] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroOpacity = useTransform(heroProgress, [0, 0.6], [1, 0])
  const heroScale = useTransform(heroProgress, [0, 0.6], [1, 0.97])
  const heroY = useTransform(heroProgress, [0, 1], [0, 60])
  const smoothHeroY = useSpring(heroY, { stiffness: 80, damping: 25 })

  useEffect(() => {
    const cb = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', cb, { passive: true })
    return () => window.removeEventListener('scroll', cb)
  }, [])

  return (
    <div className="relative bg-background overflow-x-hidden">
      {/* ══════════════════ NAV ══════════════════ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-2xl border-b border-foreground/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_40px_rgba(0,0,0,0.3)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/images/feasiai-icon.svg"
              alt="FeasiAI"
              width={30}
              height={30}
              className="transition-transform group-hover:scale-110 duration-300"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-foreground">FeasiAI</span>
              <span className="text-[9px] font-medium tracking-widest uppercase text-foreground/30">
                FeasiAI
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['#strategies', '#how-it-works', '#programs', '#sources'].map(anchor => (
              <a
                key={anchor}
                href={anchor}
                className="text-[13px] font-medium text-foreground/40 hover:text-foreground transition-colors duration-200 capitalize"
              >
                {anchor.replace('#', '').replace('-', ' ')}
              </a>
            ))}
            <Link href="/" className="text-[13px] font-medium text-foreground/40 hover:text-foreground transition-colors duration-200">
              Home
            </Link>
            <Link href="/pricing" className="text-[13px] font-medium text-foreground/40 hover:text-foreground transition-colors duration-200">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="text-foreground/50 hover:text-foreground hover:bg-foreground/[0.06]" />
            <MagneticWrap strength={0.15}>
              <Link href="/login">
                <Button
                  size="sm"
                  className="font-semibold bg-secondary hover:bg-secondary/90 text-white shadow-[0_0_20px_rgba(245,130,32,0.25)] hover:shadow-[0_0_32px_rgba(245,130,32,0.4)] transition-all text-[13px]"
                >
                  Try It Free
                  <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </MagneticWrap>
            <MobileNav scrolled={scrolled} />
          </div>
        </div>
      </nav>

      {/* ══════════════════ HERO ══════════════════ */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
              top: '10%',
              left: '10%',
            }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(245,130,32,0.10) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(245,130,32,0.06) 0%, transparent 70%)',
              bottom: '15%',
              right: '10%',
            }}
            animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[300px] h-[300px] rounded-full"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
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
                className="mb-6 py-1.5 px-4 border-violet-500/20 bg-violet-500/[0.06] text-violet-400 text-xs font-medium tracking-wide"
              >
                <SparklesIcon className="w-3 h-3 mr-1.5" />
                11 Strategies · 29 Reference Files · 3-Phase AI Pipeline
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-foreground tracking-tight leading-[1.05]"
            >
              Every entitlement strategy.
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-secondary to-amber-400 bg-clip-text text-transparent">
                One address.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-lg sm:text-xl text-foreground/50 max-w-2xl mx-auto mt-6 leading-relaxed"
            >
              Type an address. Get a professional 20-page feasibility report evaluating{' '}
              <strong className="text-foreground/70">CHIP, TOC, AB&nbsp;1287, AB&nbsp;2334, SB&nbsp;79, AB&nbsp;2011</strong> and
              every applicable California housing incentive — in minutes, not weeks.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
              <MagneticWrap strength={0.12}>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold bg-secondary hover:bg-secondary/90 text-white shadow-[0_0_40px_rgba(245,130,32,0.3)] hover:shadow-[0_0_60px_rgba(245,130,32,0.5)] transition-all duration-300 rounded-xl"
                  >
                    Run Your First Analysis
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </MagneticWrap>
              <MagneticWrap strength={0.12}>
                <a href="tel:8187935058">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold border-foreground/10 text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-300 rounded-xl"
                  >
                    <PhoneIcon className="w-4 h-4 mr-2" />
                    Talk to an Expert
                  </Button>
                </a>
              </MagneticWrap>
            </motion.div>

            {/* Speed comparison pill */}
            <motion.div variants={fadeUp} className="mt-12 flex justify-center">
              <div className="inline-flex items-center gap-6 rounded-full border border-foreground/[0.10] bg-foreground/[0.04] backdrop-blur-sm px-6 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <ClockIcon className="w-4 h-4 text-foreground/40" />
                  <span className="text-foreground/50">Traditional consultant:</span>
                  <span className="font-semibold text-foreground/70 line-through decoration-red-400/60">1–2 weeks</span>
                </div>
                <div className="w-px h-5 bg-foreground/10" />
                <div className="flex items-center gap-2 text-sm">
                  <ZapIcon className="w-4 h-4 text-secondary" />
                  <span className="text-foreground/50">FeasiAI AI:</span>
                  <span className="font-bold text-secondary">~8 minutes</span>
                </div>
              </div>
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
              { val: 11, suffix: '', label: 'Strategies evaluated' },
              { val: 29, suffix: '', label: 'Reference files (ordinance math)' },
              { val: 8, suffix: ' min', label: 'Average report time' },
              { val: 358, suffix: '+', label: 'Feasibility reports delivered' },
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

      {/* ══════════════════ 11 STRATEGIES ══════════════════ */}
      <section id="strategies" className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-28 sm:py-36">
        <ScrollReveal className="text-center mb-16">
          <SectionTag>Strategy Engine</SectionTag>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
            <Counter target={11} /> strategies.{' '}
            <span className="text-secondary">Evaluated simultaneously.</span>
          </h2>
          <p className="text-foreground/50 text-base max-w-2xl mx-auto mt-4 leading-relaxed">
            Most consultants check 2–3 programs. Our AI evaluates every applicable California
            entitlement strategy in parallel — density bonus, FAR, affordability, parking, setbacks — for every viable path.
          </p>
        </ScrollReveal>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={stagger}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {STRATEGIES.map((s) => (
            <motion.div key={s.id} variants={fadeUp}>
              <StrategyCard strategy={s} />
            </motion.div>
          ))}

          {/* Summary card */}
          <motion.div variants={scaleIn} className="sm:col-span-2 lg:col-span-3">
            <div className="relative rounded-2xl border border-secondary/20 bg-secondary/[0.04] p-6 sm:p-8 text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-secondary/[0.04] via-transparent to-violet-500/[0.04]" />
              <div className="relative">
                <p className="text-lg font-semibold text-foreground">
                  Every strategy computes:{' '}
                  <span className="text-foreground/60 font-normal">
                    density bonus % · max units · FAR · affordability requirements · parking relief · setback reductions · buildable area · unit mix
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════ HOW IT WORKS — 3 PHASES ══════════════════ */}
      <section id="how-it-works" className="relative z-10 py-28 sm:py-36">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-16">
            <SectionTag>3-Phase Pipeline</SectionTag>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Address in.{' '}
              <span className="text-secondary">Report out.</span>
            </h2>
            <p className="text-foreground/50 text-base max-w-2xl mx-auto mt-4 leading-relaxed">
              Type a property address. Six specialized AI agents coordinate across three phases to deliver
              a professional feasibility report — the same quality a senior land-use consultant produces, in a fraction of the time.
            </p>
          </ScrollReveal>

          <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PHASES.map((phase, i) => (
              <ScrollReveal key={phase.num} delay={i * 0.12} className="h-full">
                <div className="relative group h-full">
                  {/* Connecting line */}
                  {i < 2 && (
                    <div className="hidden lg:block absolute top-12 left-[calc(100%+0.5rem)] w-[calc(100%-2rem)] h-px z-0">
                      <motion.div
                        className="h-full bg-gradient-to-r from-secondary/30 to-violet-500/30"
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.3 + i * 0.2 }}
                        style={{ transformOrigin: 'left' }}
                      />
                    </div>
                  )}

                  <div className="relative rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] backdrop-blur-sm p-8 hover:bg-foreground/[0.07] hover:border-foreground/[0.18] transition-all duration-500 h-full overflow-hidden flex flex-col">
                    <span className="text-6xl font-black text-foreground/[0.04] absolute top-3 right-5 select-none">{phase.num}</span>

                    <div className="flex items-center gap-3 mb-5 shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/30 to-violet-500/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-secondary">{phase.num}</span>
                      </div>
                      <Badge variant="outline" className="text-[11px] text-foreground/50 border-foreground/10">
                        {phase.duration}
                      </Badge>
                    </div>

                    <h3 className="text-xl font-semibold text-foreground tracking-tight mb-3 shrink-0">{phase.title}</h3>
                    <p className="text-sm text-foreground/50 leading-relaxed mb-5 flex-1">{phase.desc}</p>

                    <ul className="space-y-2 shrink-0">
                      {phase.details.map(d => (
                        <li key={d} className="flex items-center gap-2 text-[13px] text-foreground/45">
                          <CheckCircleIcon className="w-3.5 h-3.5 text-secondary/60 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Pipeline summary */}
          <ScrollReveal delay={0.3} className="mt-10 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-6 px-8 rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04]">
              <div className="flex items-center gap-3">
                <BrainCircuitIcon className="w-5 h-5 text-violet-400" />
                <span className="text-sm font-medium text-foreground">6 AI Agents</span>
              </div>
              <div className="hidden sm:block w-px h-5 bg-foreground/10" />
              <div className="flex items-center gap-3">
                <LayersIcon className="w-5 h-5 text-secondary" />
                <span className="text-sm font-medium text-foreground">29 Reference Files</span>
              </div>
              <div className="hidden sm:block w-px h-5 bg-foreground/10" />
              <div className="flex items-center gap-3">
                <ZapIcon className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-foreground">12–15 Tool Calls Total</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Live demo */}
          <ScrollReveal delay={0.2} className="mt-16">
            <div className="text-center mb-8">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Watch the pipeline{' '}
                <span className="text-secondary">in action</span>
              </h3>
              <p className="text-sm text-foreground/50 mt-2 max-w-lg mx-auto">
                See five specialized agents collaborate in real-time — from address lookup to final report.
              </p>
            </div>
            <div className="rounded-2xl border border-foreground/[0.10] bg-foreground/[0.02] backdrop-blur-sm p-4 sm:p-6 lg:p-8">
              <LiveDemo variant="feasibility" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════ PROGRAMS COVERED ══════════════════ */}
      <section id="programs" className="relative z-10 py-28 sm:py-36">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full opacity-[0.05]" style={{ background: `radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 60%)` }} aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-16">
            <SectionTag>California Programs</SectionTag>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Every incentive.{' '}
              <span className="text-secondary">Always current.</span>
            </h2>
            <p className="text-foreground/50 text-base max-w-2xl mx-auto mt-4 leading-relaxed">
              Built on the actual ordinance math — not estimates. Our reference files encode CHIP Ordinance 188,477,
              Gov Code § 65915, LAMC code sections, and every applicable state bill.
            </p>
          </ScrollReveal>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid gap-5 md:grid-cols-2"
          >
            {PROGRAMS.map(prog => (
              <motion.div key={prog.name} variants={fadeUp}>
                <div className="group rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] p-6 sm:p-8 hover:bg-foreground/[0.07] hover:border-foreground/[0.18] transition-all duration-500 h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground tracking-tight">{prog.name}</h3>
                      <p className="text-xs text-foreground/40 mt-0.5">{prog.full}</p>
                    </div>
                    <a
                      href={prog.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1.5 rounded-lg text-foreground/30 hover:text-secondary hover:bg-secondary/10 transition-colors"
                      aria-label={`View ${prog.name} source`}
                    >
                      <ExternalLinkIcon className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline" className="text-[11px] border-foreground/10">{prog.ordinance}</Badge>
                    <Badge variant="outline" className="text-[11px] border-foreground/10">{prog.code}</Badge>
                    <Badge variant="outline" className="text-[11px] border-foreground/10">Eff. {prog.effective}</Badge>
                  </div>

                  <p className="text-sm text-foreground/50 leading-relaxed">{prog.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ WHAT YOU GET ══════════════════ */}
      <section className="relative z-10 py-28 sm:py-36">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-16">
            <SectionTag>Report Output</SectionTag>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              What consultants charge{' '}
              <span className="text-secondary">$5K–$15K for.</span>
            </h2>
            <p className="text-foreground/50 text-base max-w-2xl mx-auto mt-4 leading-relaxed">
              A professional-grade feasibility report matching the format senior land-use consultants deliver —
              except it arrives in 8 minutes instead of 2 weeks.
            </p>
          </ScrollReveal>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              { icon: BuildingIcon, title: 'Property & Zoning Profile', desc: 'Lot dimensions, zone classification, overlays, specific plans, Q conditions, all pulled automatically from ZIMAS.' },
              { icon: LayersIcon, title: 'Strategy Comparison Matrix', desc: 'Side-by-side comparison of all viable strategies — max units, density bonus %, FAR, parking ratio, setbacks.' },
              { icon: CalculatorIcon, title: 'Density & FAR Calculations', desc: 'Precise density bonus formulas per CHIP Ord. 188,477 and Gov Code § 65915. MARD rounding rules applied.' },
              { icon: ShieldCheckIcon, title: 'Affordability Requirements', desc: 'Exact VLI/LI/Moderate unit counts per strategy. Deed restriction terms. Rent limits from LAHD schedules.' },
              { icon: TrainFrontIcon, title: 'Transit & Location Analysis', desc: 'Distance to major/local transit stops. TOC tier determination. VMT analysis for AB 2334 eligibility.' },
              { icon: FileTextIcon, title: '20-Page PDF Export', desc: 'Professional report ready for investor review, lender packages, or internal decision-making. Download as PDF.' },
            ].map(item => (
              <motion.div key={item.title} variants={fadeUp}>
                <div className="group rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] p-6 hover:bg-foreground/[0.07] hover:border-foreground/[0.16] transition-all duration-500 h-full">
                  <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] border border-foreground/[0.10] flex items-center justify-center mb-4 group-hover:bg-violet-500/10 group-hover:border-violet-500/20 transition-colors duration-300">
                    <item.icon className="w-[18px] h-[18px] text-foreground/60 group-hover:text-violet-400 transition-colors duration-300" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight mb-2">{item.title}</h3>
                  <p className="text-[13px] text-foreground/50 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════ SOURCE CITATIONS ══════════════════ */}
      <section id="sources" className="relative z-10 py-20 sm:py-28">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <ScrollReveal className="text-center mb-10">
            <SectionTag>Source Citations</SectionTag>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-[1.1]">
              Built on official sources.{' '}
              <span className="text-secondary">Always verifiable.</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] divide-y divide-foreground/[0.08]">
              {SOURCES.map(src => (
                <a
                  key={src.url}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-6 py-4 hover:bg-foreground/[0.04] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GlobeIcon className="w-4 h-4 text-foreground/30 flex-shrink-0 group-hover:text-secondary transition-colors" />
                    <span className="text-sm text-foreground/60 group-hover:text-foreground transition-colors truncate">{src.label}</span>
                  </div>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-foreground/20 flex-shrink-0 group-hover:text-secondary transition-colors" />
                </a>
              ))}
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
            style={{ background: `radial-gradient(circle, ${isDark ? 'rgba(139,92,246,0.10)' : 'rgba(139,92,246,0.06)'} 0%, transparent 60%)` }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl lg:text-[3.5rem] font-extrabold text-foreground tracking-tight leading-[1.08]">
              Know what you can build
              <br />
              <span className="text-secondary">before you spend a dollar.</span>
            </h2>
            <p className="text-base text-foreground/45 max-w-lg mx-auto mt-5 leading-relaxed">
              Pre-development intelligence that covers every incentive program,
              every density bonus, every California housing pathway — from one address.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">
              <MagneticWrap strength={0.12}>
                <Link href="/login">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold bg-secondary hover:bg-secondary/90 text-white shadow-[0_0_40px_rgba(245,130,32,0.3)] hover:shadow-[0_0_60px_rgba(245,130,32,0.5)] transition-all duration-300 rounded-xl"
                  >
                    Run Your First Analysis
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </MagneticWrap>
              <MagneticWrap strength={0.12}>
                <Link href="/pricing">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-10 py-6 text-base font-semibold border-foreground/10 text-foreground/70 hover:text-foreground hover:bg-foreground/[0.06] hover:border-foreground/20 transition-all duration-300 rounded-xl"
                  >
                    View Pricing
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </MagneticWrap>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="relative z-10 border-t border-foreground/[0.10]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2.5">
                <Image src="/images/feasiai-icon.svg" alt="FeasiAI" width={22} height={22} />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-foreground">FeasiAI</span>
                  <span className="text-[9px] text-foreground/40 tracking-widest uppercase">FeasiAI</span>
                </div>
              </Link>
              <p className="text-xs text-foreground/40 leading-relaxed">
                AI-powered feasibility analysis and permit review for California housing development.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground/50 tracking-wider uppercase mb-4">Platform</h4>
              <ul className="space-y-2 text-[13px] text-foreground/40">
                <li><Link href="/feasibility" className="hover:text-foreground/70 transition-colors font-medium text-foreground/55">Feasibility Analysis</Link></li>
                <li><Link href="/" className="hover:text-foreground/70 transition-colors">All Workflows</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground/70 transition-colors">Pricing</Link></li>
                <li><Link href="/how-it-works" className="hover:text-foreground/70 transition-colors">How It Works</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground/50 tracking-wider uppercase mb-4">Resources</h4>
              <ul className="space-y-2 text-[13px] text-foreground/40">
                <li><a href="https://planning.lacity.gov/plans-policies/citywide-housing-incentive-program" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 transition-colors">CHIP Program</a></li>
                <li><a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=65915" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 transition-colors">CA Density Bonus Law</a></li>
                <li><a href="https://zimas.lacity.org" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 transition-colors">ZIMAS</a></li>
                <li><Link href="/contact" className="hover:text-foreground/70 transition-colors">Talk to Sales</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-foreground/50 tracking-wider uppercase mb-4">Contact</h4>
              <ul className="space-y-2.5 text-[13px] text-foreground/40">
                <li className="flex items-start gap-2.5">
                  <MapPinIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-foreground/30" />
                  12925 Riverside Dr Suite 302, Sherman Oaks, CA 91423
                </li>
                <li className="flex items-center gap-2.5">
                  <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0 text-foreground/30" />
                  <a href="tel:8187935058" className="hover:text-foreground/70 transition-colors">(818) 793-5058</a>
                </li>
                <li className="flex items-center gap-2.5">
                  <MailIcon className="w-3.5 h-3.5 flex-shrink-0 text-foreground/30" />
                  <a href="mailto:sales@feasiai.com" className="hover:text-foreground/70 transition-colors">sales@feasiai.com</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-foreground/[0.05] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-foreground/35">&copy; 2026 FeasiAI. All Rights Reserved.</p>
            <div className="flex gap-6 text-xs text-foreground/35">
              <Link href="/legal/terms" className="hover:text-foreground/55 transition-colors">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-foreground/55 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════════════ STRUCTURED DATA (JSON-LD) ══════════════════ */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'FeasiAI Feasibility Analysis',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'AI-powered property development feasibility analysis evaluating 11 California entitlement strategies including CHIP, TOC, AB 1287, AB 2334, SB 79, and AB 2011.',
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'USD',
              lowPrice: '149',
              highPrice: '5000',
              offerCount: '7',
              description: 'Platform access starts at $149/month and report packs start at $325.',
            },
            author: {
              '@type': 'Organization',
              name: 'FeasiAI',
              url: 'https://feasiai.com',
              address: {
                '@type': 'PostalAddress',
                streetAddress: '12925 Riverside Dr Suite 302',
                addressLocality: 'Sherman Oaks',
                addressRegion: 'CA',
                postalCode: '91423',
              },
            },
            featureList: [
              'CHIP Ordinance 188477 analysis',
              'Transit Oriented Communities (TOC) eligibility',
              'State Density Bonus (AB 1287, AB 2334)',
              'SB 79 transit-oriented development',
              'AB 2011 commercial-to-housing',
              'ZIMAS data integration',
              '20-page PDF feasibility report',
              '11 entitlement strategies evaluated',
            ],
          }),
        }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   STRATEGY CARD
   ═══════════════════════════════════════════════════════════ */
function StrategyCard({
  strategy,
}: {
  strategy: (typeof STRATEGIES)[number]
}) {
  const Icon = strategy.icon

  const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'group-hover:border-slate-500/25',   glow: 'rgba(100,116,139,0.06)' },
    blue:    { bg: 'bg-blue-500/10',     text: 'text-blue-400',    border: 'group-hover:border-blue-500/25',    glow: 'rgba(59,130,246,0.06)' },
    amber:   { bg: 'bg-amber-500/10',    text: 'text-amber-400',   border: 'group-hover:border-amber-500/25',   glow: 'rgba(245,158,11,0.06)' },
    emerald: { bg: 'bg-emerald-500/10',  text: 'text-emerald-400', border: 'group-hover:border-emerald-500/25', glow: 'rgba(16,185,129,0.06)' },
    violet:  { bg: 'bg-violet-500/10',   text: 'text-violet-400',  border: 'group-hover:border-violet-500/25',  glow: 'rgba(139,92,246,0.06)' },
    rose:    { bg: 'bg-rose-500/10',     text: 'text-rose-400',    border: 'group-hover:border-rose-500/25',    glow: 'rgba(244,63,94,0.06)' },
    teal:    { bg: 'bg-teal-500/10',     text: 'text-teal-400',    border: 'group-hover:border-teal-500/25',    glow: 'rgba(20,184,166,0.06)' },
    lime:    { bg: 'bg-lime-500/10',     text: 'text-lime-400',    border: 'group-hover:border-lime-500/25',    glow: 'rgba(132,204,22,0.06)' },
    cyan:    { bg: 'bg-cyan-500/10',     text: 'text-cyan-400',    border: 'group-hover:border-cyan-500/25',    glow: 'rgba(6,182,212,0.06)' },
    orange:  { bg: 'bg-orange-500/10',   text: 'text-orange-400',  border: 'group-hover:border-orange-500/25',  glow: 'rgba(249,115,22,0.06)' },
    gray:    { bg: 'bg-gray-500/10',     text: 'text-gray-400',    border: 'group-hover:border-gray-500/25',    glow: 'rgba(107,114,128,0.06)' },
  }
  const c = colorMap[strategy.color] || colorMap.slate

  return (
    <div className={`group relative rounded-2xl border border-foreground/[0.10] bg-foreground/[0.04] ${c.border} hover:bg-foreground/[0.07] transition-all duration-500 h-full overflow-hidden`}>
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 30% 30%, ${c.glow} 0%, transparent 60%)` }}
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`w-4 h-4 ${c.text}`} />
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-foreground/10 text-foreground/40">
            {strategy.id}
          </Badge>
        </div>
        <h3 className="text-base font-semibold text-foreground tracking-tight mb-1.5">{strategy.name}</h3>
        <p className="text-[13px] text-foreground/50 leading-relaxed">{strategy.desc}</p>
      </div>
    </div>
  )
}
