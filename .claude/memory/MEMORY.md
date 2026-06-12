# Project memory index

Memories for this project are checked into the repo here (`.claude/memory/`), not stored in any user/global scope. One file per fact; this index lists them. The rule itself is documented under "Project memory" in the root `CLAUDE.md`.

- [No co-author trailer](no-coauthor-trailer.md) — omit Co-Authored-By from commit messages
- [QR-menu long-term plan](qr-menu-longterm-plan.md) — roadmap + key product/arch decisions (identity, payments, real-time, phasing)
- [Prefer CLI over manual writing](prefer-cli-over-manual-writing.md) — use pnpm add / shadcn init / prisma init / nest generate, never hand-edit package.json
- [Verify with doc-search tools](verify-with-doc-search-tools.md) — check shadcn/better-auth/zod(inkeep)/context7 docs before using a library
- [Work in phases + commit approval](work-in-phases-commit-approval.md) — stop after each phase, suggest commit message, get approval, then auto-commit
- [No product name](no-product-name.md) — project is unnamed; never put any product name in code/UI/commits/history
- [A11y target-size deviation](a11y-target-size-deviation.md) — shipped UI is WCAG 2.2 AA (24px) but below the spec's ≥44px goal; tracked, canvas excepted
