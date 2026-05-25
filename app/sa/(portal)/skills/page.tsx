import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { HeartPulseIcon } from 'lucide-react'
import { SkillUpdateAction } from './skill-update-action'

const MATURITY_COLORS: Record<string, string> = {
  production: 'default',
  maturity: 'default',
  update_requested: 'secondary',
  stale: 'secondary',
  needs_attention: 'destructive',
  draft: 'outline',
}

function accuracyColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

export default async function SASkillsPage() {
  const supabase = await createClient()

  const { data: skills } = await (supabase
    .from('skill_nodes' as any)
    .select('*')
    .order('accuracy_score', { ascending: true }) as any)

  return (
    <div className="space-y-6">
      <SAPageHeader
        title="Skill Health"
        icon={HeartPulseIcon}
        subtitle="Monitor skill accuracy, freshness, and maturity status."
      />

      <Card>
        <CardHeader>
          <CardTitle>All Skills</CardTitle>
          <CardDescription>
            {skills?.length ?? 0} skills registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Version</th>
                  <th className="pb-3 pr-4 font-medium">Last Verified</th>
                  <th className="pb-3 pr-4 font-medium">Accuracy</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Executions</th>
                  <th className="pb-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(!skills || skills.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No skills registered yet
                    </td>
                  </tr>
                )}
                {(skills as any[])?.map((skill: any) => (
                  <tr key={skill.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/sa/skills/${skill.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {skill.name}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      {skill.version ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {skill.last_verified
                        ? new Date(skill.last_verified).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className={`py-3 pr-4 font-semibold ${accuracyColor(skill.accuracy_score ?? 100)}`}>
                      {skill.accuracy_score ?? 100}%
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={MATURITY_COLORS[skill.maturity ?? 'production'] as any}>
                        {skill.maturity ?? 'production'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {skill.total_executions ?? 0}
                    </td>
                    <td className="py-3 pr-4">
                      <SkillUpdateAction skillId={skill.id} skillName={skill.name} />
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
