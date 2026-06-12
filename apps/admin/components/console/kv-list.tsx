export function KvList({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-col">{children}</dl>
}

export function KvRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 border-b border-border/60 py-3 last:border-0">
      <dt className="w-40 shrink-0 pt-0.5 text-sm text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm">{children}</dd>
    </div>
  )
}
