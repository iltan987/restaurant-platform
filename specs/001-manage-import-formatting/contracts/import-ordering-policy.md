# Contract: Canonical Import-Ordering Policy

The single, repo-wide definition of "correct" import order. Encoded once in
`packages/eslint-config/base.js` and enforced identically at commit time and in CI.

## Group order (rendered top → bottom, blank line between groups)

1. **Side-effect imports** — `import "./globals.css"`, `import "reflect-metadata"`.
   *Not sorted* — kept in source order (load-order safety, FR-012).
2. **Node builtins** — `import { join } from "node:path"`.
3. **External packages** — third-party, scoped (non-`@repo`) and bare:
   `react`, `next/link`, `@nestjs/common`, `zod`.
4. **Workspace packages** — `@repo/*`: `@repo/schemas`, `@repo/ui/components/button`.
5. **App-internal alias** — `@/*`: `@/features/restaurants/api`.
6. **Relative** — `../lib/x` then `./sibling`.

## `simple-import-sort/imports` `groups` value

```js
groups: [
  // 1. Side-effect imports (the plugin marks these; they are not reordered).
  ["^\\u0000"],
  // 2. Node.js builtins.
  ["^node:"],
  // 3. External packages: scoped packages that are NOT @repo and NOT the @/ alias,
  //    plus bare package names.
  ["^@(?!repo/|/)\\w", "^\\w"],
  // 4. Workspace packages.
  ["^@repo/"],
  // 5. App-internal alias.
  ["^@/"],
  // 6. Relative imports (parent dirs, then current dir).
  ["^\\.\\.(?!/?$)", "^\\.\\./?$", "^\\./(?=.*/[^/]*$)", "^\\.(?!/?$)", "^\\./?$"],
]
```

`simple-import-sort/exports` is enabled with no options (`"error"`).

## Behavioral contract

- **Deterministic**: `eslint --fix` on already-conforming source produces no diff (SC-001).
- **Auto-fixable**: every ordering violation is fixed by `eslint --fix`; no manual edits.
- **Side-effect-safe**: side-effect imports never move relative to each other (FR-012).
- **Severity**: `"error"` — so `turbo lint` (CI) fails on violations, matching the
  commit-time gate (FR-010 / SC-006).

## Worked example

Before (random):

```ts
import { z } from "zod"
import "./styles.css"
import { Button } from "@repo/ui/components/button"
import { join } from "node:path"
import { api } from "@/features/x/api"
import { helper } from "../lib/helper"
import React from "react"
```

After (`eslint --fix`):

```ts
import "./styles.css"

import { join } from "node:path"

import React from "react"
import { z } from "zod"

import { Button } from "@repo/ui/components/button"

import { api } from "@/features/x/api"

import { helper } from "../lib/helper"
```
