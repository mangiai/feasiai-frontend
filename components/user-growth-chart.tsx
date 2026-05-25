'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  users: number
}

export function UserGrowthChart() {
  const [data, setData] = useState<DataPoint[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (!profiles?.length) return

      // Aggregate by day
      const dailyCounts = new Map<string, number>()
      let cumulative = 0
      for (const p of profiles) {
        const day = new Date(p.created_at).toISOString().slice(0, 10)
        cumulative++
        dailyCounts.set(day, cumulative)
      }

      setData(
        Array.from(dailyCounts.entries()).map(([date, users]) => ({
          date,
          users,
        }))
      )
    }
    load()
  }, [supabase])

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No user data available.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="userGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
          labelFormatter={(v) => new Date(v).toLocaleDateString()}
        />
        <Area
          type="monotone"
          dataKey="users"
          stroke="hsl(var(--primary))"
          fill="url(#userGrowthFill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
