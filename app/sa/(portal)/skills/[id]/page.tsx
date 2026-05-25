import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  CheckCircleIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { SkillUpdateAction } from '../skill-update-action'

const MATURITY_COLORS: Record<string, string> = {
  production: 'default',
  stale: 'secondary',
  needs_attention: 'destructive',
  update_requested: 'secondary',
  draft: 'outline',
}

const SOURCE_STATUS_COLORS: Record<string, string> = {
  current: 'default',
  changed: 'secondary',
  unreachable: 'destructive',
  unknown: 'outline',
}

export default async function SASkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: skill },
    { data: edges },
    { data: executions },
  ] = await Promise.all([
    (supabase.from('skill_nodes' as any).select('*').eq('id', id).single() as any),
    (supabase.from('skill_edges' as any).select('*, source:source_skill_id(id, name), target:target_skill_id(id, name)').or(`source_skill_id.eq.${id},target_skill_id.eq.${id}`) as any),
    (supabase.from('skill_executions' as any).select('*').eq('skill_node_id', id).order('created_at', { ascending: false }).limit(20) as any),
  ])

  if (!skill) return notFound()

  // Get source URLs for this skill
  const { data: sources } = await (supabase
    .from('source_registry' as any)
    .select('*')
    .contains('associated_skills', [skill.name]) as any)

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          href="/sa/skills"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to skills
        </Link>
      </div>
      <SAPageHeader
        title={skill.name}
        icon={CheckCircleIcon}
        subtitle="Skill detail and execution history."
        actions={<SkillUpdateAction skillId={skill.id} skillName={skill.name} />}
      />

      {/* Description */}
      {skill.metadata?.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{skill.metadata.description}</p>
            {skill.metadata?.programs && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(skill.metadata.programs as string[]).map((p: string) => (
                  <Badge key={p} variant="secondary">{p}</Badge>
                ))}
              </div>
            )}
            {(skill.metadata?.strategies || skill.metadata?.reference_files || skill.metadata?.phases) && (
              <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
                {skill.metadata.strategies && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Strategies</dt>
                    <dd className="font-semibold">{skill.metadata.strategies}</dd>
                  </div>
                )}
                {skill.metadata.reference_files && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Reference Files</dt>
                    <dd className="font-semibold">{skill.metadata.reference_files}</dd>
                  </div>
                )}
                {skill.metadata.phases && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Phases</dt>
                    <dd className="font-semibold">{skill.metadata.phases}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Version</dt>
              <dd className="font-mono">{skill.version ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last Verified</dt>
              <dd>{skill.last_verified ? new Date(skill.last_verified).toLocaleDateString() : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Accuracy</dt>
              <dd className="font-semibold">{skill.accuracy_score ?? 100}%</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Maturity</dt>
              <dd>
                <Badge variant={MATURITY_COLORS[skill.maturity ?? 'production'] as any}>
                  {skill.maturity ?? 'production'}
                </Badge>
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Content Hash</dt>
              <dd className="font-mono text-xs truncate">{skill.content_hash ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Executions</dt>
              <dd>{skill.total_executions ?? 0}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Dependencies */}
      <Card>
        <CardHeader>
          <CardTitle>Dependencies</CardTitle>
          <CardDescription>{edges?.length ?? 0} connections</CardDescription>
        </CardHeader>
        <CardContent>
          {(!edges || edges.length === 0) ? (
            <p className="text-sm text-muted-foreground">No dependencies registered</p>
          ) : (
            <div className="space-y-2">
              {edges.map((edge: any) => (
                <div key={edge.id} className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/sa/skills/${edge.source?.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {edge.source?.name}
                  </Link>
                  <Badge variant="outline" className="text-xs">
                    {edge.relationship}
                  </Badge>
                  <Link
                    href={`/sa/skills/${edge.target?.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    {edge.target?.name}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source URLs */}
      <Card>
        <CardHeader>
          <CardTitle>Source URLs</CardTitle>
          <CardDescription>{sources?.length ?? 0} tracked sources</CardDescription>
        </CardHeader>
        <CardContent>
          {(!sources || sources.length === 0) ? (
            <p className="text-sm text-muted-foreground">No source URLs tracked</p>
          ) : (
            <div className="space-y-2">
              {sources.map((src: any) => (
                <div key={src.id} className="flex items-center justify-between text-sm">
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-md">
                    {src.url}
                  </a>
                  <div className="flex items-center gap-2">
                    <Badge variant={SOURCE_STATUS_COLORS[src.status ?? 'unknown'] as any}>
                      {src.status ?? 'unknown'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {src.last_checked ? new Date(src.last_checked).toLocaleDateString() : 'never checked'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
          <CardDescription>Last 20 runs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Flow</th>
                  <th className="pb-3 pr-4 font-medium">Confidence</th>
                  <th className="pb-3 pr-4 font-medium">Feedback</th>
                  <th className="pb-3 pr-4 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {(!executions || executions.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No executions recorded
                    </td>
                  </tr>
                )}
                {executions?.map((exec: any) => (
                  <tr key={exec.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(exec.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">{exec.flow_type}</td>
                    <td className="py-3 pr-4">{exec.confidence_score ?? '—'}</td>
                    <td className="py-3 pr-4">{exec.human_feedback_score ?? '—'}</td>
                    <td className="py-3 pr-4 text-muted-foreground truncate max-w-xs">
                      {exec.feedback_notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
