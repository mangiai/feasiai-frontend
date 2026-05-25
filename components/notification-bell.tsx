'use client'

import { useCallback, useEffect, useState } from 'react'
import { BellIcon, CheckCheckIcon, ExternalLinkIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/toast'
import type { Notification } from '@/types/database'

function timeAgo(dateString: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  )
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count)
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications?limit=10')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unread_count)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      toast('Failed to load notifications', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' })
      if (res.ok) {
        setUnreadCount(0)
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, status: 'read' as const, read_at: new Date().toISOString() }))
        )
      }
    } catch (err) {
      console.error('Failed to mark all read:', err)
      toast('Failed to mark notifications as read', 'error')
    }
  }

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Supabase Realtime subscription for new notifications
  useEffect(() => {
    const supabase = createClient()
    let userId: string | null = null

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id

      const channel = supabase
        .channel('notifications-realtime')
        .on<Notification>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotification = payload.new
            setUnreadCount((prev) => prev + 1)
            setNotifications((prev) => [newNotification, ...prev].slice(0, 10))
            toast(newNotification.title || 'New notification', 'info')
          }
        )
        .subscribe()

      return channel
    }

    let channel: ReturnType<typeof supabase.channel> | undefined

    setupSubscription().then((ch) => {
      channel = ch
    })

    return () => {
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [toast])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  const isUnread = (n: Notification) =>
    n.status === 'pending' || n.status === 'sent'

  const markSingleRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, status: 'read' as const, read_at: new Date().toISOString() } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  const handleNotificationClick = (n: Notification) => {
    if (isUnread(n)) markSingleRead(n.id)
    const meta = n.metadata as Record<string, unknown> | null
    const url = meta?.url as string | undefined || meta?.path as string | undefined
    if (url) {
      setOpen(false)
      router.push(url)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={markAllRead}
            >
              <CheckCheckIcon className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </p>
          ) : (
            notifications.map((n) => {
              const meta = n.metadata as Record<string, unknown> | null
              const hasLink = !!(meta?.url || meta?.path)
              return (
              <div
                key={n.id}
                className={`flex gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/50 ${hasLink ? 'cursor-pointer' : ''}`}
                onClick={() => handleNotificationClick(n)}
                role={hasLink ? 'link' : undefined}
              >
                {isUnread(n) && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
                <div className={`min-w-0 flex-1 ${!isUnread(n) ? 'ml-5' : ''}`}>
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  {n.body && (
                    <p className="truncate text-xs text-muted-foreground">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </div>
              )
            })
          )}
        </div>

        <div className="border-t px-4 py-2">
          <Link
            href="/settings/notifications"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            View all
            <ExternalLinkIcon className="h-3 w-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
