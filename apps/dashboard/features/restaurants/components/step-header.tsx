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
      <p className="text-xs font-semibold tracking-wider text-brand uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-ink-3">
        {lead}
      </p>
    </div>
  )
}
