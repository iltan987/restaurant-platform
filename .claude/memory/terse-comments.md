---
name: terse-comments
description: User dislikes verbose comments/docs (esp. .env.example); keep them terse
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a27a5e78-8450-474f-8636-895f45df8770
---

Keep comments and doc prose terse — especially in `.env.example` files. The user
pushed back when example-file comments grew into multi-line paragraphs ("getting
too big… like reading a book").

**Why:** config/example files are scanned, not read; long rationale buries the
one thing the reader needs (what to set). Deep rationale belongs in CLAUDE.md or
code, not repeated across env templates.

**How to apply:** one line per var where possible; state what to set + the minimal
why. Don't repeat the same explanatory block across multiple files — if a script
or CLAUDE.md covers it, point to that instead. When adding a tool/script, prefer a
one-line pointer over re-documenting the manual steps it replaces. Related:
[[prefer-cli-over-manual-writing]].
