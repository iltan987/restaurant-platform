---
name: work-in-phases-commit-approval
description: "Work in phases — after each piece, STOP, suggest a commit message, get approval, then auto-commit"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3ea9ef92-cf25-47e5-a6f3-174f36bb4f11
---

Progress in phases, not one big rush. After finishing a discrete piece of work:

1. **STOP** — don't immediately start the next task.
2. Suggest a commit message for what was just done.
3. Ask the user for approval.
4. On approval, auto-commit with that message (unless the user said otherwise). On
   request, the user may tell you to keep going without stopping, or not to commit.

Honor existing commit conventions: see [[no-coauthor-trailer]] (omit the Co-Authored-By
trailer).

**Why:** Phased, checkpoint-based progress keeps the user in control, produces clean
reviewable commits, and avoids large unreviewed batches of changes.

**How to apply:** Decompose work into phases up front; pause at each boundary for the
commit-approval cycle rather than chaining tasks to completion.
