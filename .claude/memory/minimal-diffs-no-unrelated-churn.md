---
name: minimal-diffs-no-unrelated-churn
description: Keep diffs scoped to the task; never reformat or churn unrelated files
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 476b9845-dfb4-4393-ad83-fbced31f16b9
---

Keep every change's diff minimal and scoped strictly to the task. Do NOT reformat or
otherwise churn files unrelated to the change — e.g. running `prettier --write .`
repo-wide when only a few new/edited files actually need formatting. The user reviews
diffs closely and will flag unexpected changes (they caught repo-wide Prettier churn in
`specs/`, `CLAUDE.md`, and asked about `.claude`/`.agents`).

**Why:** unrelated churn buries the real change, pollutes review, and reformats
docs/governance files that were intentionally left as-authored.

**How to apply:**
- Apply only the normalization a gate actually requires. For the import-hygiene feature,
  the ESLint import sweep was required (rules are errors → `turbo lint` must pass), but a
  repo-wide `prettier --write .` was NOT — source `.ts/.tsx` was already Prettier-clean,
  so Prettier only churned out-of-scope docs/JSON/configs.
- Exclude agent-managed / vendored trees from formatters: `.specify/`, `.claude/`,
  `.agents/` are in `.prettierignore`.
- When a bootstrapping hook (husky/lint-staged) would reformat pre-existing files that
  were never formatter-managed (e.g. `CLAUDE.md`, root `package.json`), commit that
  bootstrap step with `git commit --no-verify` to avoid re-introducing the churn.
- Split mechanical churn (e.g. the import sweep) into its own commit, separate from the
  feature wiring.

See [[work-in-phases-commit-approval]] and [[no-coauthor-trailer]].
