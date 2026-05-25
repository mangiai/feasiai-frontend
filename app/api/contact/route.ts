import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; subject?: string; message?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { name, email, subject, message } = body

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (typeof email !== 'string' || !email.includes('@') || email.length > 320) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  if (typeof name !== 'string' || name.length > 200) {
    return NextResponse.json({ error: 'Name too long' }, { status: 400 })
  }

  if (typeof subject !== 'string' || subject.length > 500) {
    return NextResponse.json({ error: 'Subject too long' }, { status: 400 })
  }

  if (typeof message !== 'string' || message.length > 5000) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    await supabase.from('audit_events').insert({
      action: 'contact_form',
      details: { name, email, subject, message },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
