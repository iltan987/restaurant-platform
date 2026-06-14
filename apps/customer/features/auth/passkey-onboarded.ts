/**
 * Per-device record that we've already offered passkey setup to a given diner,
 * so the post-sign-in prompt asks once and never nags. Keyed by user id (a
 * shared device prompts each account once); `localStorage` is inherently
 * per-device, so signing in on a new device prompts there too.
 */
const key = (userId: string) => `pk-onboarded:${userId}`

export function isPasskeyOnboarded(userId: string): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(key(userId)) === "1"
}

export function markPasskeyOnboarded(userId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(key(userId), "1")
}
