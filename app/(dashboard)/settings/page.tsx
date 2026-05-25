'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangleIcon } from 'lucide-react'
import type { Profile, ProfessionType } from '@/types/database'

const PROFESSION_OPTIONS = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'architect', label: 'Architect' },
  { value: 'property_owner', label: 'Property Owner' },
  { value: 'developer', label: 'Developer' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
] as const
const NO_PROFESSION_VALUE = '__none__'

export default function ProfileSettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [profession, setProfession] = useState<ProfessionType | ''>('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [accountActionMessage, setAccountActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        const p = data as Profile
        setProfile(p)
        setFullName(p.full_name || '')
        setProfession((p.profession as ProfessionType) || '')
      }
    }
    load()
  }, [supabase])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        profession: (profession || null) as ProfessionType | null,
      })
      .eq('id', profile.id)

    setSaving(false)
    if (error) {
      setMessage({ type: 'error', text: 'Failed to save changes.' })
    } else {
      setMessage({ type: 'success', text: 'Profile updated.' })
    }
  }

  async function handleDownloadDataExport() {
    setExporting(true)
    setAccountActionMessage(null)
    try {
      const res = await fetch('/api/user/export', { method: 'GET', credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Export failed')
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition')
      const match = cd?.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `feasiai-export-${new Date().toISOString().slice(0, 10)}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      setAccountActionMessage({ type: 'success', text: 'Download started.' })
    } catch (e) {
      setAccountActionMessage({
        type: 'error',
        text: e instanceof Error ? e.message : 'Export failed.',
      })
    } finally {
      setExporting(false)
    }
  }

  async function handleChangePassword() {
    if (!newPassword.trim()) return
    setChangingPassword(true)
    setPasswordMessage(null)

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPassword(false)
    if (error) {
      setPasswordMessage({ type: 'error', text: error.message || 'Failed to change password.' })
    } else {
      setPasswordMessage({ type: 'success', text: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPassword('')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profession">Profession</Label>
            <Select
              value={profession || NO_PROFESSION_VALUE}
              onValueChange={(value) => setProfession(value === NO_PROFESSION_VALUE ? '' : value as ProfessionType)}
            >
              <SelectTrigger id="profession" className="h-9 w-full rounded-md px-3 py-1 text-sm">
                <SelectValue placeholder="Select profession" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={NO_PROFESSION_VALUE}>Select profession</SelectItem>
                {PROFESSION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {message && (
            <p className={message.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-600'}>
              {message.text}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Account type</Label>
            <p className="text-sm text-muted-foreground capitalize">
              {profile?.account_type || 'Individual'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Member since</Label>
            <p className="text-sm text-muted-foreground">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Current password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New password"
            />
          </div>

          {passwordMessage && (
            <p className={passwordMessage.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-600'}>
              {passwordMessage.text}
            </p>
          )}

          <Button onClick={handleChangePassword} disabled={changingPassword || !newPassword.trim()}>
            {changingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>Export or delete the information associated with your login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a JSON copy of profile, workspaces, projects, reports, billing metadata, and output summaries (large
            artifacts are omitted). Account deletion removes your auth user after clearing solo workspaces; if you belong
            to a <strong>shared</strong> workspace, leave or transfer it first—otherwise deletion will be blocked.
          </p>
          {accountActionMessage && (
            <p
              className={
                accountActionMessage.type === 'error' ? 'text-sm text-destructive' : 'text-sm text-green-600'
              }
            >
              {accountActionMessage.text}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleDownloadDataExport} disabled={exporting}>
              {exporting ? 'Preparing…' : 'Download data export'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangleIcon className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently deletes your login and eligible workspace data. Shared workspaces must be resolved first; see
            Your data above for an export.
          </p>
          <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. We will remove your user and solo-member workspaces. If you are in a workspace with
              other active members, cancel and leave those workspaces first, then try again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingAccount}
              onClick={async (e) => {
                e.preventDefault()
                setDeletingAccount(true)
                setAccountActionMessage(null)
                try {
                  const res = await fetch('/api/user/delete-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ confirm: 'DELETE MY ACCOUNT' }),
                  })
                  const body = await res.json().catch(() => ({}))
                  if (!res.ok) {
                    setAccountActionMessage({
                      type: 'error',
                      text: (body as { error?: string }).error || 'Deletion failed.',
                    })
                    return
                  }
                  setShowDeleteConfirm(false)
                  await supabase.auth.signOut()
                  window.location.href = '/'
                } catch {
                  setAccountActionMessage({ type: 'error', text: 'Deletion failed.' })
                } finally {
                  setDeletingAccount(false)
                }
              }}
            >
              {deletingAccount ? 'Deleting…' : 'Delete my account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
