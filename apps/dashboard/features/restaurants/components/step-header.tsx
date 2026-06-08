export function StepHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string
  title: string
  lead: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        {lead}
      </p>
    </div>
  )
}
