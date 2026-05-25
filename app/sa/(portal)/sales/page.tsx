import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/stats-card'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import {
  DollarSignIcon,
  UsersIcon,
  TrendingUpIcon,
  PercentIcon,
  BarChart3Icon,
} from 'lucide-react'
import { SalesExportButton } from './export-button'

export default async function SASalesPage() {
  const supabase = await createClient()

  const [purchasesRes, activeCustomersRes, allCustomersRes] = await Promise.all([
    supabase
      .from('credit_ledger')
      .select('id, workspace_id, amount, balance_after, description, created_at, created_by, workspaces(name)')
      .eq('transaction_type', 'purchase')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('billing_accounts')
      .select('workspace_id', { count: 'exact', head: true })
      .gt('credit_balance', 0),
    supabase
      .from('billing_accounts')
      .select('workspace_id', { count: 'exact', head: true }),
  ])

  const purchases = (purchasesRes.data as any[]) ?? []
  const totalRevenue = purchases.reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const activeCustomers = activeCustomersRes.count ?? 0
  const allCustomers = allCustomersRes.count ?? 0
  const avgRevenue = activeCustomers > 0 ? Math.round(totalRevenue / activeCustomers) : 0
  const conversionRate = allCustomers > 0 ? Math.round((activeCustomers / allCustomers) * 100) : 0

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader title="Sales Pipeline" icon={DollarSignIcon} subtitle="Revenue performance and purchase activity." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={DollarSignIcon} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
        <StatsCard icon={UsersIcon} label="Active Customers" value={activeCustomers} />
        <StatsCard icon={TrendingUpIcon} label="Avg Revenue/Customer" value={`$${avgRevenue.toLocaleString()}`} />
        <StatsCard icon={PercentIcon} label="Conversion Rate" value={`${conversionRate}%`} />
      </div>

      {/* Revenue Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="w-5 h-5" />
            Revenue Over Time
          </CardTitle>
          <CardDescription>Monthly purchase revenue trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
            Revenue chart — connect a charting library to visualize monthly trends
          </div>
        </CardContent>
      </Card>

      {/* Recent Purchases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Purchases</CardTitle>
              <CardDescription>Credit purchases across all workspaces</CardDescription>
            </div>
            <SalesExportButton purchases={purchases} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Workspace</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Balance After</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.workspaces?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default" className="text-green-500">
                        +${(p.amount ?? 0).toLocaleString()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.balance_after ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{p.description || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No purchases found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
