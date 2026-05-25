'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { MailIcon, MapPinIcon } from 'lucide-react'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [honeypot, setHoneypot] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Honeypot: bots fill this hidden field; silently "succeed" without submitting
    if (honeypot) {
      setStatus('sent')
      return
    }

    setStatus('sending')

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      subject: (form.elements.namedItem('subject') as HTMLInputElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to send')
      setStatus('sent')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Contact Us</h1>
          <p className="text-lg text-muted-foreground">
            Have a question or need help? We&rsquo;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send a message</CardTitle>
                <CardDescription>Fill out the form and we&rsquo;ll get back to you shortly.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" required placeholder="Your name" maxLength={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" required placeholder="you@example.com" maxLength={255} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" required placeholder="How can we help?" maxLength={200} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" name="message" required rows={5} placeholder="Tell us more…" maxLength={5000} />
                  </div>
                  <Button type="submit" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Send Message'}
                  </Button>
                  {status === 'sent' && (
                    <p role="alert" aria-live="polite" className="text-sm text-green-600">Message sent successfully! We&rsquo;ll be in touch.</p>
                  )}
                  {status === 'error' && (
                    <p role="alert" aria-live="polite" className="text-sm text-destructive">Failed to send. Please try again.</p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <MailIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Email</h3>
                    <p className="text-sm text-muted-foreground">support@FeasiAI.ai</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Location</h3>
                    <p className="text-sm text-muted-foreground">Los Angeles, California</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
