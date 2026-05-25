import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const SA_TABLE_PAGE_SIZE = 15

type SAPaginationBase = {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize?: number
  itemLabel?: string
}

type SAPaginationLinks = SAPaginationBase & {
  mode: 'links'
  pageHref: (page: number) => string
}

type SAPaginationButtons = SAPaginationBase & {
  mode: 'buttons'
  onPageChange: (page: number) => void
  showFirstLast?: boolean
}

export type SAPaginationProps = SAPaginationLinks | SAPaginationButtons

function rangeLabel(totalItems: number, currentPage: number, pageSize: number) {
  if (totalItems === 0) return { first: 0, last: 0 }
  const first = (currentPage - 1) * pageSize + 1
  const last = Math.min(currentPage * pageSize, totalItems)
  return { first, last }
}

function PaginationShell({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      {summary}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function SAPagination(props: SAPaginationProps) {
  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize = SA_TABLE_PAGE_SIZE,
    itemLabel = 'items',
  } = props

  if (totalItems === 0) return null

  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const { first, last } = rangeLabel(totalItems, safePage, pageSize)
  const prevDisabled = safePage <= 1
  const nextDisabled = safePage >= totalPages

  const summary = (
    <p className="text-xs text-muted-foreground">
      Showing {first.toLocaleString()}-{last.toLocaleString()} of {totalItems.toLocaleString()} {itemLabel}
    </p>
  )

  const pageIndicator = (
    <span className="px-2 text-xs text-muted-foreground">
      Page {safePage.toLocaleString()} of {totalPages.toLocaleString()}
    </span>
  )

  if (props.mode === 'links') {
    return (
      <PaginationShell summary={summary}>
        {prevDisabled ? (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon className="mr-1 h-3.5 w-3.5" />
            Previous
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={props.pageHref(safePage - 1)}>
              <ChevronLeftIcon className="mr-1 h-3.5 w-3.5" />
              Previous
            </Link>
          </Button>
        )}
        {pageIndicator}
        {nextDisabled ? (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRightIcon className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm">
            <Link href={props.pageHref(safePage + 1)}>
              Next
              <ChevronRightIcon className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </PaginationShell>
    )
  }

  const { onPageChange, showFirstLast = true } = props

  return (
    <PaginationShell summary={summary}>
      {showFirstLast ? (
        <Button type="button" variant="outline" size="sm" disabled={prevDisabled} onClick={() => onPageChange(1)}>
          First
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={prevDisabled}
        onClick={() => onPageChange(Math.max(1, safePage - 1))}
      >
        <ChevronLeftIcon className="mr-1 h-3.5 w-3.5" />
        Previous
      </Button>
      {pageIndicator}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={nextDisabled}
        onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
      >
        Next
        <ChevronRightIcon className="ml-1 h-3.5 w-3.5" />
      </Button>
      {showFirstLast ? (
        <Button type="button" variant="outline" size="sm" disabled={nextDisabled} onClick={() => onPageChange(totalPages)}>
          Last
        </Button>
      ) : null}
    </PaginationShell>
  )
}
