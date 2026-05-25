import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'About — FeasiAI & FeasiAI',
  description: 'Learn about FeasiAI and the FeasiAI platform — our mission, values, and team behind AI-powered ADU permit review.',
}
import { Card, CardContent } from '@/components/ui/card'
import { TargetIcon, UsersIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react'
import Link from 'next/link'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'

const values = [
  {
    icon: TargetIcon,
    title: 'Accuracy',
    description: 'Every analysis is grounded in current state and local code — no guesswork.',
  },
  {
    icon: SparklesIcon,
    title: 'Accessibility',
    description: 'We make permit feasibility understandable for homeowners and professionals alike.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Trust',
    description: 'Optional expert verification ensures you can rely on results before spending money.',
  },
  {
    icon: UsersIcon,
    title: 'Community',
    description: 'We believe California\u2019s housing shortage is solvable \u2014 one ADU at a time.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-20 space-y-20">
        {/* Mission */}
        <section className="text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-6">Our Mission</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            FeasiAI exists to democratize ADU permit feasibility. We combine AI-powered plan
            analysis with deep regulatory knowledge so homeowners, architects, and contractors can
            confidently navigate California&rsquo;s complex building codes — faster and at a fraction
            of the cost of traditional consulting.
          </p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-2xl font-bold text-center mb-8">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((v) => (
              <Card key={v.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <v.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{v.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{v.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="text-center">
          <h2 className="text-2xl font-bold mb-4">Our Team</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A small team of engineers, architects, and housing advocates building the future of
            permit analysis from Los Angeles, California.
          </p>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-bold mb-4">Join the movement</h2>
          <p className="text-muted-foreground mb-6">
            Start with platform access, then run the report tier that matches the deal you&apos;re evaluating.
          </p>
          <Link href="/pricing">
            <Button size="lg">See Pricing &amp; Plans</Button>
          </Link>
        </section>
      </div>
      <SiteFooter />
    </div>
  )
}
