import { NextResponse } from 'next/server'

export async function GET() {
  // Never expose secrets. This endpoint only returns presence + URL.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null
  const anonKeyPresent = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const serviceRoleKeyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

  const isCloud = typeof url === 'string' && url.includes('.supabase.co')
  const projectRef =
    typeof url === 'string'
      ? url
          .replace(/^https?:\/\//, '')
          .split('.')[0]
      : null

  return NextResponse.json({
    supabase: {
      url,
      isCloud,
      projectRef,
      anonKeyPresent,
      serviceRoleKeyPresent,
    },
  })
}

