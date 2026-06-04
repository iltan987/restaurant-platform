---
name: verify-with-doc-search-tools
description: "Before using a library, consult its doc-search tool (shadcn MCP, better-auth, zod/inkeep, context7 fallback) for up-to-date info"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3ea9ef92-cf25-47e5-a6f3-174f36bb4f11
---

Before using or configuring a package, use the available documentation-search tooling to
confirm current, version-correct usage — do not rely on training memory for APIs/versions.

- Preferred per-library tools: **shadcn MCP** (components/registries), **better-auth**
  skills/MCP, **zod v4** via the inkeep MCP tools.
- **context7** is the always-available fallback for any other library/framework/CLI.
- The user may enable/disable specific doc tools per session for cost reasons — if a
  preferred one is unavailable, fall back to context7 rather than guessing.

**Why:** Claude's training data lags real releases; these tools surface the newest APIs,
flags, and breaking changes so generated code matches the installed versions.

**How to apply:** When a task touches a library's API/config/CLI, search its docs first,
then write code. Pairs with [[prefer-cli-over-manual-writing]].
