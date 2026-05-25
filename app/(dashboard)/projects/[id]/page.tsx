import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectDetailClient } from './project-detail-client'
import type { Json } from '@/types/database'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { assertLegacyProjectAccess, getAdminSupabase } from '@/lib/server/access-control'

export const dynamic = 'force-dynamic'

interface ProjectPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ showcase?: string }>
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { id } = await params
  const { showcase } = await searchParams
  const supabase = await createClient()
  const adminSupabase = getAdminSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const access = await assertLegacyProjectAccess({ userId: user.id, projectId: id })
  if (!access.ok) notFound()

  const { data: project, error } = await adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !project) notFound()

  // Fetch files
  const { data: files } = await adminSupabase
    .schema(APP_DB_SCHEMA)
    .from('files')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: true })

  // Fetch zoning data from public schema project (if linked)
  let zoningData: Json | null = null
  const { data: publicProject } = await supabase
    .from('projects')
    .select('zoning_data, generation_tier')
    .eq('id', id)
    .single()

  const generationTier =
    publicProject?.generation_tier === 'free' || publicProject?.generation_tier === 'standard'
      ? publicProject.generation_tier
      : null

  if (publicProject) {
    zoningData = publicProject.zoning_data
  }

  return (
    <ProjectDetailClient
      initialProject={project}
      initialFiles={files || []}
      userId={user.id}
      showcaseOutputId={showcase}
      zoningData={zoningData}
      generationTier={generationTier}
    />
  )
}
