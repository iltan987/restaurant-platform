/**
 * Per-device, per-user record of how a diner has responded to the "add a
 * passkey" nudge, so we prompt respectfully instead of nagging:
 *
 * - `"snoozed"`  — tapped "Daha sonra" or soft-closed; eligible again only after
 *                  a long cooldown (bank-app cadence, never every session).
 * - `"declined"` — tapped "İstemiyorum"; never ask again.
 * - `"done"`     — added a passkey (here or from the account drawer); never ask.
 *
 * `lastShownAt` (epoch ms) gates the snooze cooldown. `localStorage` is
 * inherently per-device, so a new device starts fresh and prompts there too.
 */
type Status = "snoozed" | "declined" | "done"

type PromptRecord = { status: Status; lastShownAt: number }

/** How long after a snooze before we may remind again. */
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const key = (userId: string) => `pk-prompt:${userId}`

function read(userId: string): PromptRecord | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key(userId))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === "object" &&
      "status" in parsed &&
      "lastShownAt" in parsed &&
      (parsed.status === "snoozed" ||
        parsed.status === "declined" ||
        parsed.status === "done") &&
      typeof parsed.lastShownAt === "number"
    ) {
      return parsed as PromptRecord
    }
    return null
  } catch {
    // Malformed / legacy value — treat as no record.
    return null
  }
}

function write(userId: string, record: PromptRecord): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key(userId), JSON.stringify(record))
  } catch {
    // Storage unavailable (private mode quota etc.) — best-effort only.
  }
}

/**
 * Whether the nudge may open now. No prior record → always eligible for a first
 * showing (brand-new account or an existing passkey-less diner alike;
 * `isNewAccount` only tunes the copy). After a snooze, only once the cooldown
 * has elapsed. Never once declined or done.
 */
export function shouldPromptPasskey(
  userId: string,
  _opts: { isNewAccount: boolean }
): boolean {
  const rec = read(userId)
  if (!rec) return true
  if (rec.status === "declined" || rec.status === "done") return false
  return Date.now() - rec.lastShownAt >= COOLDOWN_MS
}

/** Mark that the nudge was shown now (baseline = snoozed), so a reload or a
 * closed tab still respects the cooldown even if the diner never chose. */
export function recordPasskeyPromptShown(userId: string): void {
  write(userId, { status: "snoozed", lastShownAt: Date.now() })
}

/** "Daha sonra" / soft close — remind again only after the cooldown. */
export function snoozePasskeyPrompt(userId: string): void {
  write(userId, { status: "snoozed", lastShownAt: Date.now() })
}

/** "İstemiyorum" — never ask again on this device. */
export function declinePasskeyPrompt(userId: string): void {
  write(userId, { status: "declined", lastShownAt: Date.now() })
}

/** Diner added a passkey — resolved, never ask again. */
export function completePasskeyPrompt(userId: string): void {
  write(userId, { status: "done", lastShownAt: Date.now() })
}
