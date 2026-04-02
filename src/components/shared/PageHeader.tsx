interface PageHeaderProps {
  title: React.ReactNode
  description?: string
  actions?: React.ReactNode
  actionsLeft?: React.ReactNode
}

export function PageHeader({ title, description, actions, actionsLeft }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-muted-foreground">{description}</p>
          )}
        </div>
        {actionsLeft && <div className="flex items-center gap-2 shrink-0 pt-1">{actionsLeft}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
