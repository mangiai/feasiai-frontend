import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CREDIT_PACKAGES } from '@/lib/pricing'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const packages = CREDIT_PACKAGES.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    credits: pkg.credits,
    price_cents: pkg.price,
    description: pkg.description,
  }))

  return NextResponse.json({ packages })
}
