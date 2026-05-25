'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { BellIcon, CheckIcon, InboxIcon, SettingsIcon } from 'lucide-react'

interface Notification {
  id: string
  channel: string
  title: string
  body: string | null
  status: string
  created_at: string
}

interface NotificationPreferences {
  report_ready: { email: boolean; in_app: boolean }
  pipeline_status: { email: boolean; in_app: boolean }
  credits_low: { email: boolean; in_app: boolean }
  collaboration_invite: { email: boolean; in_app: boolean }
  verification_complete: { email: boolean; in_app: boolean }
  comments: { email: boolean; in_app: boolean }
}

const CATEGORY_LABELS: Record<string, string> = {
  report_ready: 'Report Ready',
  pipeline_status: 'Pipeline Status',
  credits_low: 'Low Credits',
  collaboration_invite: 'Collaboration Invites',
  verification_complete: 'Verification Complete',
  comments: 'Comments',
}

const DEFAULT_PREFS: NotificationPreferences = {
  report_ready: { email: true, in_app: true },
  pipeline_status: { email: false, in_app: true },
  credits_low: { email: true, in_app: true },
  collaboration_invite: { email: true, in_app: true },
  verification_complete: { email: true, in_app: true },
  comments: { email: false, in_app: true },
}

const PAGE_SIZE = 25

export default function NotificationsSettingsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS)
  const [prefsSaving, setPrefsSaving] = useState(false)

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await fetch('/api/notifications/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.preferences) setPrefs({ ...DEFAULT_PREFS, ...data.preferences })
        }
      } catch {
        // use defaults
      }
    }
    loadPrefs()
  }, [])

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    })
    if (filter === 'unread') params.set('status', 'unread')
    const res = await fetch(`/api/notifications?${params}`)
    if (res.ok) {
      const data = await res.json()
      const items = data.notifications || []
      setNotifications(prev => page === 0 ? items : [...prev, ...items])
      setUnreadCount(data.unread_count || 0)
      setHasMore(items.length === PAGE_SIZE)
    }
    setLoading(false)
  }, [filter, page])

  useEffect(() => { setPage(0) }, [filter])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  async function markAllRead() {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read' }),
    })
    if (res.ok) {
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })))
      setUnreadCount(0)
    }
  }

  async function markRead(id: string) {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', notification_ids: [id] }),
    })
    if (res.ok) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'read' } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  async function handlePrefToggle(
    category: keyof NotificationPreferences,
    channel: 'email' | 'in_app',
    value: boolean
  ) {
    const updated = {
      ...prefs,
      [category]: { ...prefs[category], [channel]: value },
    }
    setPrefs(updated)
    setPrefsSaving(true)
    try {
      await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: updated }),
      })
    } catch {
      // revert on error
      setPrefs(prefs)
    } finally {
      setPrefsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose how you want to be notified for each category.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
              <span>Category</span>
              <span className="text-center">Email</span>
              <span className="text-center">In-App</span>
            </div>
            {(Object.keys(CATEGORY_LABELS) as (keyof NotificationPreferences)[]).map(cat => (
              <div key={cat} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center py-2">
                <Label className="text-sm">{CATEGORY_LABELS[cat]}</Label>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={prefs[cat]?.email ?? false}
                    onChange={e => handlePrefToggle(cat, 'email', e.target.checked)}
                    disabled={prefsSaving}
                    className="h-4 w-4 rounded border-input"
                  />
                </div>
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={prefs[cat]?.in_app ?? false}
                    onChange={e => handlePrefToggle(cat, 'in_app', e.target.checked)}
                    disabled={prefsSaving}
                    className="h-4 w-4 rounded border-input"
                  />
                </div>
              </div>
            ))}
          </div>
          {prefsSaving && (
            <p className="text-xs text-muted-foreground mt-2">Saving...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BellIcon className="w-5 h-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
                )}
              </CardTitle>
              <CardDescription>Stay updated on project activity and team changes.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread
              </Button>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllRead}>
                  <CheckIcon className="w-3 h-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <InboxIcon className="w-10 h-10 mb-3" />
              <p className="text-sm">No notifications yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between py-3 gap-3 ${n.status === 'unread' ? 'bg-accent/30 -mx-4 px-4 rounded' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {n.status === 'unread' && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium truncate">{n.title}</p>
                    </div>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  {n.status === 'unread' && (
                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                      <CheckIcon className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={loading}>
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
