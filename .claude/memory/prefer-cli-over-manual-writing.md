---
name: prefer-cli-over-manual-writing
description: "Use CLI tools (pnpm add, shadcn init, prisma init, nest generate) instead of hand-writing config/scaffold files"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3ea9ef92-cf25-47e5-a6f3-174f36bb4f11
---

When adding a dependency or scaffolding something, prefer the official CLI over manual
file authoring:

- **Installing packages**: NEVER edit `package.json` by hand to add a dependency. Always
  use `pnpm add ...` (respecting the workspace `catalog:` convention where relevant).
- **Scaffolding / init**: When a CLI does (even partially) what you want — `shadcn init`,
  `prisma init`, `nest generate ...`, etc. — run it first, then edit the output to taste.
  Don't reimplement what a generator already produces.
- If a CLI step needs interactive choices (e.g. `create-next-app` prompts), just ask the
  user to run it and explain what to pick — don't engineer a workaround.

**Why:** CLIs produce correct, version-appropriate boilerplate and keep lockfiles/config
consistent; hand-writing drifts from current conventions and misses generated wiring.

**How to apply:** Reach for the generator/installer first, then customize. Relates to
[[verify-with-doc-search-tools]] (check current CLI flags before running).
