/**
 * Dev host switcher — flip every app between `localhost` and `<ip>.nip.io`.
 *
 * Local dev runs on `localhost`; testing on a physical device over the LAN
 * needs a real domain (cookies with a `Domain=` won't stick to a bare IP), so
 * we use `<ip>.nip.io`, which resolves to that IP. The host appears in a dozen
 * env vars across `apps/api/.env` and the Next apps' `.env.local`; this rewrites
 * them in one shot instead of hand-editing each.
 *
 * Usage:
 *   pnpm host local              → everything on localhost
 *   pnpm host lan                → auto-detect the LAN IPv4 → <ip>.nip.io
 *   pnpm host lan 192.168.1.99   → use an explicit IP → <ip>.nip.io
 *
 * Under WSL, auto-detect returns the *Windows host's* LAN IP (queried via
 * PowerShell), not the WSL2 NAT adapter — that's the address a phone on the
 * network can actually reach. Pass an explicit IP if detection fails.
 *
 * Only the host token inside a fixed allowlist of URL vars is swapped; ports,
 * schemes and paths are preserved, and host-irrelevant vars (DATABASE_URL,
 * SMTP_HOST, secrets, GOOGLE_*) are never touched. API_INTERNAL_URL is always
 * pinned to localhost — SSR reaches the API process locally, and the LAN IP
 * isn't necessarily routable from the server itself.
 */

import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { readFile, writeFile } from "node:fs/promises"
import { networkInterfaces } from "node:os"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))

// Files holding host-bearing dev config (api uses .env; Next apps use .env.local).
const FILES = [
  "apps/api/.env",
  "apps/dashboard/.env.local",
  "apps/customer/.env.local",
  "apps/admin/.env.local",
]

// Vars whose host should follow the chosen mode.
const SWITCH_KEYS = new Set([
  "ADMIN_URL",
  "DASHBOARD_URL",
  "CUSTOMER_URL",
  "BETTER_AUTH_URL",
  "ROOT_DOMAIN",
  "S3_ENDPOINT",
  "MEDIA_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_ROOT_DOMAIN",
  "NEXT_PUBLIC_CUSTOMER_ROOT_DOMAIN",
  "NEXT_PUBLIC_CUSTOMER_URL",
  "NEXT_PUBLIC_DASHBOARD_URL",
  "ALLOWED_DEV_ORIGIN",
])

// Vars pinned to localhost in every mode (server-to-server hops).
const PIN_LOCALHOST_KEYS = new Set(["API_INTERNAL_URL"])

// Matches the current host token: a bare `localhost` or `<a.b.c.d>.nip.io`.
const HOST_TOKEN = /(?:\d{1,3}\.){4}nip\.io|localhost/g

const PRIVATE_IPV4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/

/** Running under WSL? Then this Linux box's interfaces are the WSL2 NAT adapter,
 * not the LAN — the IP a phone needs is the *Windows host's* LAN IP. */
function isWsl() {
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true
  try {
    return /microsoft|wsl/i.test(readFileSync("/proc/version", "utf8"))
  } catch {
    return false
  }
}

/** Windows host's LAN IPv4 (the adapter that owns the default gateway), via
 * PowerShell. Returns null if it can't be determined (pass an IP explicitly). */
function detectWindowsLanIp() {
  // execFileSync (no shell) so PowerShell's `$_` isn't eaten by /bin/sh.
  const script =
    "Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } | " +
    "ForEach-Object { $_.IPv4Address.IPAddress } | Select-Object -First 1"
  try {
    const out = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", script],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim()
    return PRIVATE_IPV4.test(out) ? out : null
  } catch {
    return null
  }
}

/** LAN IPv4 of this host — WSL-aware (queries Windows when applicable). */
function detectLanIp() {
  if (isWsl()) return detectWindowsLanIp()
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal) continue
      if (PRIVATE_IPV4.test(a.address)) return a.address
    }
  }
  return null
}

function parseTarget(argv) {
  const mode = argv[0]
  if (mode === "local") return { host: "localhost", label: "localhost" }
  if (mode === "lan") {
    const ip = argv[1] ?? detectLanIp()
    if (!ip) {
      throw new Error(
        "Could not auto-detect a LAN IPv4" +
          (isWsl() ? " from the Windows host" : "") +
          ". Pass one explicitly: pnpm host lan <ip>"
      )
    }
    return { host: `${ip}.nip.io`, label: `${ip}.nip.io` }
  }
  throw new Error(
    "Usage: pnpm host <local|lan> [ip]\n" +
      "  pnpm host local\n" +
      "  pnpm host lan            (auto-detect LAN IP)\n" +
      "  pnpm host lan 192.168.1.99"
  )
}

/** Replace the host token inside a single `KEY=value` line. */
function rewriteLine(line, host) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line)
  if (!m) return line
  const [, key, value] = m
  const target = PIN_LOCALHOST_KEYS.has(key)
    ? "localhost"
    : SWITCH_KEYS.has(key)
      ? host
      : null
  if (target === null) return line
  return `${key}=${value.replace(HOST_TOKEN, target)}`
}

async function main() {
  const { host, label } = parseTarget(process.argv.slice(2))
  let touched = 0
  for (const rel of FILES) {
    const path = new URL(rel, `file://${root}`).pathname
    let content
    try {
      content = await readFile(path, "utf8")
    } catch {
      console.log(`  skip   ${rel} (not found)`)
      continue
    }
    const next = content
      .split("\n")
      .map((line) => rewriteLine(line, host))
      .join("\n")
    if (next !== content) {
      await writeFile(path, next)
      touched++
      console.log(`  write  ${rel}`)
    } else {
      console.log(`  ok     ${rel} (already ${label})`)
    }
  }
  console.log(`\nHost set to ${label} (${touched} file(s) changed).`)
  console.log("Restart the dev server for changes to take effect.")
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
