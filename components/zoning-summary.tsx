'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Json } from '@/types/database'

interface ZoningData {
  zone_code?: string
  zone_description?: string
  lot_area?: number
  height_limit?: number | string
  far?: number | string
  setbacks?: {
    front?: number | string
    side?: number | string
    rear?: number | string
  }
  adu_eligible?: boolean
  [key: string]: unknown
}

interface ZoningSummaryProps {
  zoningData: Json | null | undefined
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? '—'}</span>
    </div>
  )
}

export function ZoningSummary({ zoningData }: ZoningSummaryProps) {
  if (!zoningData || typeof zoningData !== 'object' || Array.isArray(zoningData)) {
    return (
      <Card className="shadow-card border-border/50">
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          No zoning data available
        </CardContent>
      </Card>
    )
  }

  const data = zoningData as unknown as ZoningData

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="p-5 space-y-1">
        <h3 className="heading-card text-foreground mb-3">Zoning Summary</h3>

        <Field label="Zone Code" value={data.zone_code} />
        <Field label="Zone Description" value={data.zone_description} />
        <Field
          label="Lot Area"
          value={data.lot_area != null ? `${Number(data.lot_area).toLocaleString()} sq ft` : undefined}
        />
        <Field
          label="Height Limit"
          value={data.height_limit != null ? `${data.height_limit} ft` : undefined}
        />
        <Field label="FAR" value={data.far != null ? String(data.far) : undefined} />

        {data.setbacks && (
          <>
            <Field label="Front Setback" value={data.setbacks.front != null ? `${data.setbacks.front} ft` : undefined} />
            <Field label="Side Setback" value={data.setbacks.side != null ? `${data.setbacks.side} ft` : undefined} />
            <Field label="Rear Setback" value={data.setbacks.rear != null ? `${data.setbacks.rear} ft` : undefined} />
          </>
        )}

        <div className="flex justify-between items-center py-1.5">
          <span className="text-sm text-muted-foreground">ADU Eligible</span>
          {data.adu_eligible != null ? (
            <Badge variant={data.adu_eligible ? 'default' : 'secondary'} className="rounded-full">
              {data.adu_eligible ? 'Yes' : 'No'}
            </Badge>
          ) : (
            <span className="text-sm font-medium text-foreground">—</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
