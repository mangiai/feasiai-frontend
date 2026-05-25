'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PersonaCard } from '@/components/persona-card'
import { useAppMode } from '@/hooks/use-app-mode'
import { useRandomAdu } from '@/hooks/use-random-adu'
import { useWorkspace } from '@/hooks/use-workspace'
import {
  DEMO_CITY_PROJECT_ID,
  DEMO_CONTRACTOR_PROJECT_ID,
} from '@/lib/dev-fixtures'
import {
  JUDGE_CITY_PROJECT_ID,
  JUDGE_CONTRACTOR_PROJECT_ID,
  SHOWCASE_CITY_OUTPUT_ID,
  SHOWCASE_CONTRACTOR_OUTPUT_ID,
} from '@/lib/app-mode'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/stats-card'
import { PipelineActivityFeed } from '@/components/pipeline-activity-feed'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  RocketIcon,
  PlusIcon,
  LayoutGridIcon,
  FolderOpenIcon,
  CoinsIcon,
  FileTextIcon,
  ActivityIcon,
  ArrowRightIcon,
  Users2Icon,
} from 'lucide-react'

const PERSONA_POOL = [
  '/images/adu/adu-01-2story-garage-transparent.png',
  '/images/adu/adu-03-garage-conversion-transparent.png',
  '/images/adu/adu-04-jadu-attached-transparent.png',
  '/images/adu/adu-05-modern-box-transparent.png',
  '/images/adu/adu-06-spanish-style-transparent.png',
  '/images/adu/adu-07-aframe-transparent.png',
  '/images/adu/adu-08-prefab-modular-transparent.png',
  '/images/adu/cameron-01-longbeach-transparent.png',
  '/images/adu/cameron-03-lakewood-transparent.png',
  '/images/adu/cameron-04-whittier-2story-transparent.png',
  '/images/adu/cameron-05-lakewood-porch-transparent.png',
  '/images/adu/cameron-06-sandimas-butterfly-transparent.png',
  '/images/adu/cameron-09-signalhill-cottage-transparent.png',
  '/images/adu/cameron-09-signalhill-cottage-v2-transparent.png',
  '/images/adu/cameron-10-downey-lshape-transparent.png',
]

export default function DashboardPage() {
  const mode = useAppMode()
  const { currentWorkspace, creditBalance } = useWorkspace()
  const supabase = createClient()

  const [projectCount, setProjectCount] = useState(0)
  const [activeRuns, setActiveRuns] = useState(0)
  const [recentProjects, setRecentProjects] = useState<{ id: string; name: string; status: string; city: string; created_at: string }[]>([])
  const [sharedProjects, setSharedProjects] = useState<{ id: string; name: string; status: string; city: string; scope: string }[]>([])

  const cityId = mode === 'dev-test' ? DEMO_CITY_PROJECT_ID : JUDGE_CITY_PROJECT_ID
  const contractorId = mode === 'dev-test' ? DEMO_CONTRACTOR_PROJECT_ID : JUDGE_CONTRACTOR_PROJECT_ID

  const cityAdu = useRandomAdu(PERSONA_POOL)
  const contractorAdu = useRandomAdu(PERSONA_POOL)

  // Load stats for real mode
  useEffect(() => {
    if (mode !== 'real' || !currentWorkspace) return

    async function loadStats() {
      const { count: pCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace!.id)

      setProjectCount(pCount ?? 0)

      const { count: runCount } = await supabase
        .from('pipeline_runs')
        .select('projects!inner(workspace_id)', { count: 'exact', head: true })
        .eq('projects.workspace_id', currentWorkspace!.id)
        .in('status', ['queued', 'running'])

      setActiveRuns(runCount ?? 0)

      const { data: recent } = await supabase
        .from('projects')
        .select('id, name, status, city, created_at')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentProjects((recent ?? []) as typeof recentProjects)

      // Load shared/collaborated projects
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: collabs } = await supabase
          .from('project_collaborations')
          .select('scope, projects(id, name, status, city)')
          .eq('grantee_user_id', user.id)
          .eq('status', 'accepted')
          .limit(10)

        if (collabs) {
          type CollaborationRow = {
            scope: string
            projects: { id: string; name: string | null; status: string | null; city: string | null } | null
          }
          setSharedProjects(
            collabs
              .filter((c) => Boolean((c as CollaborationRow).projects))
              .map((c) => {
                const row = c as CollaborationRow
                return {
                  id: row.projects!.id,
                  name: String(row.projects!.name ?? ''),
                  status: String(row.projects!.status ?? ''),
                  city: String(row.projects!.city ?? ''),
                  scope: row.scope,
                }
              }),
          )
        }
      }
    }

    loadStats()
  }, [mode, currentWorkspace, supabase])

  // Real mode — production dashboard with stats
  if (mode === 'real') {
    return (
      <div className="space-y-8 animate-fade-up">
        <div className="page-header pt-4">
          <h1 className="heading-display text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Your workspace at a glance
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard icon={FolderOpenIcon} label="Projects" value={projectCount} />
          <StatsCard icon={CoinsIcon} label="Credits" value={creditBalance.toLocaleString()} />
          <StatsCard icon={ActivityIcon} label="Active Runs" value={activeRuns} />
          <StatsCard icon={FileTextIcon} label="Pending Reports" value={0} description="Coming soon" />
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <Link href="/projects/new">
            <Button className="font-semibold">
              <PlusIcon className="w-4 h-4 mr-1.5" />
              New Project
            </Button>
          </Link>
          <Link href="/my-projects">
            <Button variant="outline" className="font-medium">
              <LayoutGridIcon className="w-4 h-4 mr-1.5" />
              View Projects
            </Button>
          </Link>
        </div>

        {/* Recent projects */}
        {recentProjects.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {recentProjects.map(p => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
                      <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <RocketIcon className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-1.5 max-w-md">
              <p className="text-foreground font-semibold">
                Ready to start?
              </p>
              <p className="text-sm text-muted-foreground">
                Upload your plan binder and corrections letter. FeasiAI&apos;s AI agents
                will review against California state code and your city&apos;s municipal code.
              </p>
            </div>
          </div>
        )}

        {/* Shared projects from collaborations */}
        {sharedProjects.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users2Icon className="w-4 h-4" />
                Shared with You
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {sharedProjects.map(p => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">{p.scope}</span>
                      <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Activity Feed (Realtime) */}
        {currentWorkspace && (
          <PipelineActivityFeed workspaceId={currentWorkspace.id} />
        )}
      </div>
    )
  }

  // Demo / Dev modes
  return (
    <div className="space-y-8 animate-fade-up">
      <div className="page-header pt-4">
        <h1 className="heading-display text-foreground">Select a Workflow</h1>
        <p className="text-muted-foreground">
          {mode === 'dev-test'
            ? 'Dev mode — step through screens with scripted data'
            : 'Select a demo scenario to explore FeasiAI'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
        <PersonaCard
          aduImage={cityAdu}
          title="City Reviewer"
          description="I'm reviewing a permit submission. Help me pre-screen it against state + city code."
          projectName="1232 N Jefferson ADU"
          projectCity="Placentia, CA"
          projectId={cityId}
          ctaText="Run AI Review"
          showcaseOutputId={mode === 'judge-demo' ? SHOWCASE_CITY_OUTPUT_ID : undefined}
        />
        <PersonaCard
          aduImage={contractorAdu}
          title="Contractor"
          description="I got a corrections letter back. Help me understand what to fix and build a response."
          projectName="1232 N Jefferson ADU"
          projectCity="Placentia, CA"
          projectId={contractorId}
          ctaText="Analyze Corrections"
          showcaseOutputId={mode === 'judge-demo' ? SHOWCASE_CONTRACTOR_OUTPUT_ID : undefined}
        />
      </div>
    </div>
  )
}
