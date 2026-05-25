'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { CoinsIcon, TrendingUpIcon, DownloadIcon, PencilIcon, Loader2Icon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SAPagination, SA_TABLE_PAGE_SIZE } from '@/components/sa/sa-pagination'

interface BillingRow {
  id: string
  workspace_id: string
  credit_balance: number
  stripe_customer_id: string | null
  plan_type: string | null
  created_at: string
  workspaces: { name: string } | null
}

interface LedgerRow {
  id: string
  workspace_id: string
  transaction_type: string
  amount: number
  balance_after: number
  description: string
  created_at: string
  workspaces: { name: string } | null
}

function CreditAdjustmentDialog({
  account,
  open,
  onOpenChange,
  onComplete,
}: {
  account: BillingRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const numAmount = parseInt(amount, 10)
    if (isNaN(numAmount) || numAmount === 0 || !reason.trim()) return
    setLoading(true)
    try {
      const supabase = createClient()
      const newBalance = (account.credit_balance || 0) + numAmount
      const { error: ledgerError } = await supabase.from('credit_ledger').insert({
        workspace_id: account.workspace_id,
        transaction_type: 'adjustment' as const,
        amount: numAmount,
        balance_after: newBalance,
        description: `SA adjustment: ${reason.trim()}`,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? 'sa-unknown',
      })
      if (!ledgerError) {
        await supabase
          .from('billing_accounts')
          .update({ credit_balance: newBalance })
          .eq('id', account.id)
      }
      onOpenChange(false)
      setAmount('')
      setReason('')
      onComplete()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credit Adjustment</DialogTitle>
          <DialogDescription>
            Adjust credits for {account.workspaces?.name || 'workspace'}. Current balance: {account.credit_balance?.toLocaleString()}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (+/-)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="e.g. 100 or -50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Reason for adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !amount || !reason.trim()}>
            {loading && <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />}
            Apply Adjustment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function exportLedgerCSV(transactions: LedgerRow[]) {
  const headers = ['Workspace', 'Type', 'Amount', 'Balance After', 'Description', 'Date']
  const rows = transactions.map((t) => [
    t.workspaces?.name || '',
    t.transaction_type || '',
    String(t.amount ?? ''),
    String(t.balance_after ?? ''),
    t.description || '',
    t.created_at ? new Date(t.created_at).toLocaleDateString() : '',
  ])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ACCOUNTS_PAGE_SIZE = SA_TABLE_PAGE_SIZE
const TRANSACTIONS_PAGE_SIZE = 10

export default function SABillingPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<BillingRow[]>([])
  const [transactions, setTransactions] = useState<LedgerRow[]>([])
  const [adjustAccount, setAdjustAccount] = useState<BillingRow | null>(null)
  const [accountsPage, setAccountsPage] = useState(1)
  const [transactionsPage, setTransactionsPage] = useState(1)

  async function load() {
    const [billingRes, ledgerRes] = await Promise.all([
      supabase
        .from('billing_accounts')
        .select('*, workspaces(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('credit_ledger')
        .select('*, workspaces(name)')
        .order('created_at', { ascending: false }),
    ])

    setAccounts((billingRes.data as BillingRow[]) || [])
    setTransactions((ledgerRes.data as LedgerRow[]) || [])
    setAccountsPage(1)
    setTransactionsPage(1)
    setLoading(false)
  }

  useEffect(() => { load() }, [supabase])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const totalBalance = accounts.reduce((sum, a) => sum + (a.credit_balance || 0), 0)
  const withCredits = accounts.filter((a) => (a.credit_balance || 0) > 0).length
  const avgBalance = accounts.length > 0 ? Math.round(totalBalance / accounts.length) : 0

  const accountsTotalPages = Math.max(1, Math.ceil(accounts.length / ACCOUNTS_PAGE_SIZE))
  const transactionsTotalPages = Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PAGE_SIZE))
  const safeAccountsPage = Math.min(Math.max(accountsPage, 1), accountsTotalPages)
  const safeTransactionsPage = Math.min(Math.max(transactionsPage, 1), transactionsTotalPages)
  const pagedAccounts = accounts.slice(
    (safeAccountsPage - 1) * ACCOUNTS_PAGE_SIZE,
    safeAccountsPage * ACCOUNTS_PAGE_SIZE,
  )
  const pagedTransactions = transactions.slice(
    (safeTransactionsPage - 1) * TRANSACTIONS_PAGE_SIZE,
    safeTransactionsPage * TRANSACTIONS_PAGE_SIZE,
  )

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader title="Platform Billing" icon={CoinsIcon} subtitle="Credit balances, transactions, and account adjustments." />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CoinsIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Total Credit Balance</span>
            </div>
            <p className="text-2xl font-bold">{totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUpIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Workspaces with Credits</span>
            </div>
            <p className="text-2xl font-bold">{withCredits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CoinsIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Average Balance</span>
            </div>
            <p className="text-2xl font-bold">{avgBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing Accounts</CardTitle>
          <CardDescription>Credit balances and Stripe info for all workspaces.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Workspace</th>
                  <th className="text-left px-4 py-3 font-medium">Credit Balance</th>
                  <th className="text-left px-4 py-3 font-medium">Stripe Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedAccounts.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{a.workspaces?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={(a.credit_balance || 0) > 0 ? 'default' : 'secondary'}>
                        {(a.credit_balance || 0).toLocaleString()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {a.stripe_customer_id ? a.stripe_customer_id.slice(0, 16) + '…' : '—'}
                    </td>
                    <td className="px-4 py-3">{a.plan_type || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => setAdjustAccount(a)}>
                        <PencilIcon className="mr-1 h-3.5 w-3.5" />
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No billing accounts found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <SAPagination
            mode="buttons"
            currentPage={safeAccountsPage}
            totalPages={accountsTotalPages}
            totalItems={accounts.length}
            pageSize={ACCOUNTS_PAGE_SIZE}
            itemLabel="accounts"
            onPageChange={setAccountsPage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Credit ledger entries across all workspaces.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportLedgerCSV(transactions)} disabled={transactions.length === 0}>
              <DownloadIcon className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Workspace</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Balance After</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {pagedTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{t.workspaces?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{t.transaction_type || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={
                        (t.amount || 0) > 0 ? 'text-green-500' : (t.amount || 0) < 0 ? 'text-red-500' : ''
                      }>
                        {(t.amount || 0) > 0 ? '+' : ''}{t.amount ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{t.balance_after ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <SAPagination
            mode="buttons"
            currentPage={safeTransactionsPage}
            totalPages={transactionsTotalPages}
            totalItems={transactions.length}
            pageSize={TRANSACTIONS_PAGE_SIZE}
            itemLabel="transactions"
            onPageChange={setTransactionsPage}
          />
        </CardContent>
      </Card>

      {adjustAccount && (
        <CreditAdjustmentDialog
          account={adjustAccount}
          open={!!adjustAccount}
          onOpenChange={(open) => { if (!open) setAdjustAccount(null) }}
          onComplete={() => load()}
        />
      )}
    </div>
  )
}
