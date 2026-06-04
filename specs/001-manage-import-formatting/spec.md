# Feature Specification: Automated Import Hygiene & Pre-Commit Formatting

**Feature Branch**: `001-manage-import-formatting`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "need a way to manage imports sorting. current is random. removal of unused imports. can we run prettier, eslint auto before each commit? (without too much overhead, can it be done easily)"

## User Scenarios & Testing *(mandatory)*

This feature serves the **developers contributing to the monorepo**. The "user" in each
story is a contributor making a commit. The value is consistent, automatically-maintained
code style with no manual ceremony and no measurable friction at commit time.

### User Story 1 - Deterministic import ordering & unused-import removal (Priority: P1)

A contributor edits a file, adding and removing imports as they work. When they commit,
the import statements in the touched files are automatically reordered into a consistent,
predictable grouping, and any imports that are no longer referenced are removed — without
the contributor having to think about it.

**Why this priority**: This is the core pain named in the request ("current is random").
Inconsistent import order produces noisy diffs, merge conflicts, and review distraction;
unused imports are dead weight and a lint smell. Solving ordering + removal alone already
delivers the primary value, independent of the broader formatting gate.

**Independent Test**: Take a file with deliberately scrambled import order and one unused
import, stage it, and commit. The committed file has imports in the canonical grouped order
with the unused import gone, and the change is reflected in the diff that lands in history.

**Acceptance Scenarios**:

1. **Given** a staged file whose imports are in arbitrary order, **When** the contributor
   commits, **Then** the committed version has imports sorted into the project's canonical
   groups (external packages, workspace `@repo/*` packages, app-internal `@/*`, relative)
   with a stable intra-group ordering.
2. **Given** a staged file containing an import that is no longer referenced anywhere in
   the file, **When** the contributor commits, **Then** the unused import is removed from
   the committed version.
3. **Given** two contributors who each touch import lines in different files, **When** both
   commit, **Then** neither introduces ordering-only churn, because the ordering is
   deterministic and identical regardless of who edits.

---

### User Story 2 - Auto-format and lint-fix at commit, low overhead (Priority: P2)

When a contributor commits, Prettier formatting and ESLint auto-fixable rules are applied
automatically to the files they are committing. The contributor experiences this as nearly
instant — only the files being committed are processed, not the whole repository — so it
does not slow the commit loop or discourage frequent commits.

**Why this priority**: This is the second half of the request ("run prettier, eslint auto
before each commit … without too much overhead"). It builds on P1 (import handling is one
class of lint fix) but extends to the full formatting/lint surface. It is separable: import
ordering can ship first, with general format-on-commit layered on after.

**Independent Test**: Stage a file with a formatting deviation (e.g. a stray semicolon,
wrong quote style, unsorted Tailwind classes) and commit. The committed file is formatted
to the project's Prettier config, and the commit completes within a couple of seconds for
a typical small changeset.

**Acceptance Scenarios**:

1. **Given** a staged file that violates Prettier rules (semicolons, single quotes, line
   width, Tailwind class order), **When** the contributor commits, **Then** the committed
   file conforms to the project Prettier configuration.
2. **Given** a staged file with an auto-fixable ESLint violation, **When** the contributor
   commits, **Then** the violation is fixed in the committed file.
3. **Given** a changeset of a handful of files, **When** the contributor commits, **Then**
   only the staged files are processed (not the entire repo) and the added latency is small
   enough not to disrupt the commit loop.
4. **Given** a staged file with an ESLint error that is NOT auto-fixable, **When** the
   contributor commits, **Then** the commit is blocked with a clear message naming the file
   and rule, so the issue is fixed before it enters history.

---

### User Story 3 - Consistent enforcement for everyone, with an escape hatch (Priority: P3)

The same formatting and import rules apply identically to every contributor's machine after
a one-time `pnpm install`, with no per-developer manual setup. In genuine emergencies a
contributor can bypass the commit-time checks deliberately, and the shared CI/quality gate
remains the ultimate backstop so nothing unformatted reaches the main branch.

**Why this priority**: Convenience features only pay off if they are uniform and
unavoidable-by-default, yet they must not trap someone who needs to commit work-in-progress.
This hardens the workflow but is not required for an individual to get value from P1/P2.

**Independent Test**: A fresh clone followed by `pnpm install` enables the commit-time
behavior with no extra steps; a documented bypass flag allows a commit to skip the checks;
and an unformatted change pushed past the local hook is still caught by the existing CI
lint/format gate.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repo, **When** a contributor runs `pnpm install` and then
   commits, **Then** the import/format behavior is active automatically with no additional
   per-developer configuration.
2. **Given** an urgent need to commit without processing, **When** the contributor uses the
   documented bypass, **Then** the commit completes without the checks running.
3. **Given** an unformatted change that bypassed the local hook, **When** it reaches the
   shared CI/quality gate, **Then** the gate flags the formatting/lint violation.

---

### Edge Cases

- **No staged files / commit with only deletions**: the commit proceeds without error and
  with no wasted processing.
- **Files outside the lint/format scope** (generated Prisma client in `src/generated/`,
  lockfiles, binary assets, `node_modules`, build outputs): MUST be ignored, matching
  existing ignore rules.
- **A tool rewrites a file during commit**: the rewritten content MUST be what gets
  committed (the staged snapshot and the committed content stay consistent — no partial or
  mismatched state).
- **Auto-fix introduces no semantic change but reorders imports across a side-effect-only
  import** (e.g. `import "./styles.css"`): ordering MUST NOT move a side-effecting import in
  a way that changes load order/behavior.
- **Merge, rebase, or amend commits**: the behavior is predictable and does not corrupt
  in-progress merge/rebase state.
- **A contributor without the tooling installed** (e.g. committing from an external GUI
  that skips hooks): the shared CI gate still enforces the rules.
- **Monorepo with multiple lint configs** (NestJS api vs Next apps vs packages): each staged
  file is processed under the rules that apply to its workspace.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST reorder import statements in committed files into a single
  canonical, deterministic grouping shared across the whole monorepo. Group order:
  external/third-party packages, workspace `@repo/*` packages, app-internal `@/*` aliases,
  then relative imports; intra-group ordering MUST be stable (e.g. alphabetical).
- **FR-002**: The system MUST remove imports that are not referenced in a file as part of
  the commit-time processing.
- **FR-003**: The system MUST apply the project's existing Prettier configuration (no
  semicolons, double quotes, `printWidth: 80`, Tailwind class sorting) to committed files.
- **FR-004**: The system MUST apply ESLint auto-fixable rules to committed files.
- **FR-005**: The system MUST process ONLY the files included in the current commit, not the
  entire repository, to keep commit-time overhead low.
- **FR-006**: The system MUST block a commit when a file contains an ESLint error that is not
  auto-fixable, reporting the offending file and rule clearly.
- **FR-007**: The system MUST activate automatically for every contributor after a single
  `pnpm install`, requiring no additional per-developer setup.
- **FR-008**: The system MUST provide a documented, intentional way to bypass the commit-time
  checks for emergencies.
- **FR-009**: The system MUST respect existing ignore rules and never process generated code
  (`src/generated/`), `node_modules`, build outputs, or lockfiles.
- **FR-010**: The import-ordering and unused-import rules MUST be expressed once and applied
  identically at commit time and in the shared CI/quality gate, so local and CI results agree.
- **FR-011**: The system MUST ensure the content produced by auto-fixing is exactly what gets
  committed (no divergence between the processed result and the recorded commit).
- **FR-012**: Import reordering MUST preserve program behavior, including not relocating
  side-effect-only imports in a way that changes execution/load order.
- **FR-013**: Formatting/lint rules and conventions MUST be configured at the monorepo level
  via shared configuration so the four apps and all packages stay consistent, per the
  project's centralized-convention principle.

### Key Entities *(include if feature involves data)*

- **Canonical import ordering policy**: the agreed grouping and intra-group sort rule that
  defines "correct" import order for every file in the repo.
- **Commit-time processing scope**: the set of files a given commit will process — derived
  from staged changes, minus ignored paths.
- **Shared lint/format configuration**: the single source of the rules (Prettier config,
  ESLint rules including import sorting and unused-import removal) consumed both locally and
  by CI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly committed source files have imports in the canonical order —
  re-running the ordering tool on a freshly committed file produces zero changes.
- **SC-002**: 0 unused imports remain in committed source files (verified by the lint gate
  reporting none on the committed tree).
- **SC-003**: For a typical commit of up to ~10 changed files, commit-time processing adds no
  more than ~2 seconds of perceived overhead, keeping the commit loop fluid.
- **SC-004**: A new contributor goes from clone to a correctly-formatted first commit with no
  setup steps beyond `pnpm install`.
- **SC-005**: Import-ordering-only diffs (churn caused solely by reordering) drop to
  effectively zero in pull requests after adoption.
- **SC-006**: Local commit-time results and the CI lint/format gate agree — a commit that
  passes locally does not fail CI for formatting/import reasons, and vice versa.

## Assumptions

- **Scope is the existing toolchain**: the project already uses ESLint and Prettier with
  shared configs (`@repo/eslint-config`, root Prettier settings); this feature configures and
  automates them rather than introducing a different formatter/linter.
- **Staged-files-only processing is the intended meaning of "low overhead"**: processing only
  what is being committed (not the whole repo) is assumed to be acceptable and desirable.
- **Blocking on unfixable errors is desired**: per the project constitution (code must pass
  lint/format before merge), commits with non-auto-fixable lint errors are blocked rather
  than allowed-with-warning. The bypass (FR-008) covers genuine emergencies.
- **Import-order convention**: the four-group ordering in FR-001 is assumed as the canonical
  policy; it mirrors the monorepo's dependency layering (external → `@repo/*` → `@/*` →
  relative) and can be adjusted during planning if desired.
- **CI gate already exists or is in scope to wire up**: the existing `pnpm lint` / `pnpm
  format` quality gate is the backstop referenced in US3/SC006; this feature ensures the
  rules it enforces match the commit-time rules.
- **Generated code stays excluded**: the Prisma generated client and other generated/build
  artifacts are out of scope for formatting, consistent with current ignore configuration.
- **One-time install activation**: contributors run `pnpm install` as part of normal setup,
  which is assumed sufficient to enable the commit-time behavior.
