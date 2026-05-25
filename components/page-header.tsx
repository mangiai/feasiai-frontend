interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="page-header">
      <h1 className="heading-display text-foreground">{title}</h1>
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}
