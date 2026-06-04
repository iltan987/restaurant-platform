# Contract: Commit-Time Processing Pipeline

Defines the hook + runner contract executed on every `git commit`.

## Activation

- Root `package.json` gains `"prepare": "husky"`. pnpm runs `prepare` automatically after
  `pnpm install`, which initializes husky and registers the git hooks path. No other
  per-developer step (FR-007).

## Hook

`.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

- Runs on `git commit`. Non-zero exit aborts the commit.
- Bypass (FR-008): `git commit --no-verify` (or `-n`).

## Runner — `.lintstagedrc.mjs` (root, single source)

```js
export default {
  "*.{ts,tsx,mts,cts}": [
    "eslint --fix --no-warn-ignored --flag v10_config_lookup_from_file",
    "prettier --write",
  ],
  "*.{js,jsx,mjs,cjs,json,md,css,yaml,yml}": "prettier --write",
}
```

### Command contract

| Aspect | Behavior |
| --- | --- |
| Scope | Staged files only; lint-staged passes **absolute paths** (FR-005). |
| Order | `eslint --fix` first (sort + remove-unused + auto-fix), then `prettier --write`. |
| Config resolution | `--flag v10_config_lookup_from_file` → ESLint resolves each file's **nearest** `eslint.config.mjs` (workspace config, or root fallback). |
| Ignored files | `--no-warn-ignored` silences eslint on workspace-ignored paths (e.g. `src/generated/**`); Prettier honors `.prettierignore` (FR-009). |
| Partial staging | lint-staged stashes unstaged hunks, fixes, re-stages — committed content == processed content (FR-011). |
| Blocking | Any non-auto-fixable ESLint **error** → non-zero exit → commit aborted with file+rule reported (FR-006). |

## `.prettierignore` additions

```gitignore
# Generated & build output — never reformat
**/src/generated/**
**/dist/**
**/.next/**
```

(Existing entries `.turbo/` and `pnpm-lock.yaml` are retained.)

## Invariants

- **Local ⇔ CI parity**: the eslint rules run here are the same ones `turbo lint` runs
  (both via `@repo/eslint-config/base.js`); a clean local commit does not fail CI for
  import/format reasons, and vice versa (FR-010 / SC-006).
- **Low overhead**: only staged files are processed; target ≤ ~2s for ≤10 files (SC-003).
- **No new global tooling**: only ESLint + Prettier execute, already present in CI.
