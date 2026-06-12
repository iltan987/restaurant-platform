import { cn } from "@repo/ui/lib/utils"

/** A small palette of brand-ish gradients, picked deterministically by slug. */
const GRADIENTS = [
  "from-rose-500 to-orange-500",
  "from-teal-500 to-cyan-600",
  "from-violet-500 to-indigo-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-fuchsia-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-lime-500 to-green-600",
]

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return (words[0]![0]! + words[1]![0]!).toUpperCase()
}

function pickGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]!
}

const SIZES = {
  sm: "size-7 rounded-md text-[11px]",
  md: "size-9 rounded-lg text-[13px]",
  lg: "size-13 rounded-xl text-lg",
} as const

/** Initials avatar standing in for a restaurant logo, colored from its slug. */
export function RestaurantLogo({
  name,
  seed,
  size = "md",
  className,
}: {
  name: string
  seed: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center bg-gradient-to-br font-semibold text-white shadow-sm select-none",
        pickGradient(seed),
        SIZES[size],
        className
      )}
    >
      {initials(name)}
    </div>
  )
}
