# Shared Packages

## Module format convention

| Package | Format | Why |
|---------|--------|-----|
| `@repo/db` | CJS (compiled) | Prisma v7 adapter requires CJS (`moduleFormat = "cjs"` in generator) |
| `@repo/schemas` | CJS (compiled) | Consumed by `@repo/db` and the NestJS API; CJS avoids interop friction |
| `@repo/query` | ESM (source-only) | Consumed exclusively by Next.js apps which handle transpilation |
| `@repo/ui` | ESM (source-only) | Same — Next.js transpiles; wildcard `exports` map scales without edits |

**Do not migrate `db` or `schemas` to ESM** — the Prisma adapter dependency makes this load-bearing.

## exports style convention

- **Compiled libs** (`db`, `schemas`): single `"."` export → `dist/index.js` / `dist/index.d.ts`
- **Source-only libs** (`query`, `ui`): subpath exports → raw `src/` files; Next.js transpiles them

`@repo/query` uses explicit named subpaths (intentionally closed surface — only two entry points).
`@repo/ui` uses wildcard subpaths (open surface — every component is individually importable).
