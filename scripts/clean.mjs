/**
 * Two-phase clean:
 *
 * Phase 1 — workspace-owned outputs
 *   Reads each workspace's package.json. If it has a `clean` script, runs it
 *   from that workspace directory. Each workspace is responsible for declaring
 *   what it generates (e.g. .next, dist, prisma/generated, *.db …).
 *   To add cleanup for a new workspace, just add a `clean` script to its
 *   package.json — no changes here needed.
 *
 * Phase 2 — global directories
 *   Removes node_modules and .turbo from every workspace and the root.
 *   These are the same for all workspaces, so they live here, not per-workspace.
 *   Runs after Phase 1 so workspace scripts can still use installed packages.
 *
 * Usage: pnpm clean
 */

import { rm, readdir, readFile, stat } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { execSync } from "node:child_process"

const root = fileURLToPath(new URL("..", import.meta.url))

// Keep in sync with the `packages:` globs in pnpm-workspace.yaml
const WORKSPACE_GROUPS = ["apps", "packages"]

// Removed from every workspace and the root — not specific to any one app
const GLOBAL_TARGETS = ["node_modules", ".turbo"]

async function getWorkspaceDirs() {
  const dirs = []
  for (const group of WORKSPACE_GROUPS) {
    const entries = await readdir(join(root, group), { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        dirs.push(join(root, group, entry.name))
      }
    }
  }
  return dirs
}

async function removeIfExists(p) {
  try {
    await stat(p)
    await rm(p, { recursive: true, force: true })
    return true
  } catch {
    return false
  }
}

const workspaceDirs = await getWorkspaceDirs()

console.log("Cleaning...\n")

// ─── Phase 1: workspace-owned outputs ────────────────────────────────────────
const phase1Lines = []

for (const wsDir of workspaceDirs) {
  const pkg = JSON.parse(await readFile(join(wsDir, "package.json"), "utf8"))

  if (pkg.scripts?.clean) {
    try {
      execSync(pkg.scripts.clean, { cwd: wsDir, stdio: "pipe", shell: true })
      phase1Lines.push(`  ✓ ${relative(root, wsDir)}  (clean)`)
    } catch (err) {
      phase1Lines.push(`  ✗ ${relative(root, wsDir)} clean failed: ${err.message}`)
    }
  }
}

// ─── Phase 2: global directories ─────────────────────────────────────────────
const allDirs = [root, ...workspaceDirs]

const globalRemoved = (
  await Promise.all(
    allDirs.flatMap((dir) =>
      GLOBAL_TARGETS.map(async (target) => {
        const p = join(dir, target)
        return (await removeIfExists(p)) ? relative(root, p) : null
      })
    )
  )
).filter(Boolean)

// ─── Output ───────────────────────────────────────────────────────────────────
phase1Lines.forEach((l) => console.log(l))
if (phase1Lines.length > 0 && globalRemoved.length > 0) console.log()
globalRemoved.forEach((r) => console.log(`  ✓ ${r}`))

const total = phase1Lines.length + globalRemoved.length
console.log(total === 0 ? "\nNothing to clean." : "\nDone.")
