import Link from 'next/link'
import { ArrowLeftIcon } from 'lucide-react'

export default function SkillNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h1 className="text-5xl font-bold text-slate-300">404</h1>
      <h2 className="text-lg font-semibold">Skill not found</h2>
      <p className="text-sm text-muted-foreground">This skill does not exist.</p>
      <Link
        href="/sa/skills"
        className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        All Skills
      </Link>
    </div>
  )
}
