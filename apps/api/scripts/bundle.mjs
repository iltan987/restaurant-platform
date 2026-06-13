// Post-`nest build` step: bundle the compiled CommonJS output into self-contained
// files so ESM-only dependencies (better-auth, @better-auth/*, @react-email/*,
// and their transitive ESM subtrees) are transpiled to CJS and inlined. Without
// this, Vercel's nestjs preset runs `dist/main.js` as CommonJS and `require()`-ing
// an ESM-only package throws ERR_REQUIRE_ESM at boot.
//
// We bundle the tsc OUTPUT (not the source) so NestJS's emitted decorator
// metadata (design:paramtypes for DI) is preserved exactly as tsc produced it.
//
// Two entry points: the server (`main.js`, run by Vercel) and the admin seed
// (`auth/seed-admin.js`, run via `pnpm --filter api seed:admin`) — both pull in
// better-auth and would otherwise fail the same way.
//
// Kept external (NOT bundled):
//  - @repo/db: the Prisma client + @prisma/adapter-pg + pg live behind it and
//    bundle poorly (engine/native lookups). Left as a require() so Vercel's file
//    tracing ships them in node_modules instead.
//  - NestJS optional peer deps that aren't installed (microservices/websockets/
//    cache transports, class-validator/-transformer — we validate with Zod):
//    Nest require()s them inside try/catch, but esbuild can't see the guard and
//    would fail to resolve them at build time.
//  - native/optional addons (pg-native).
import { access, rename, rm } from "node:fs/promises"

import { build } from "esbuild"

const external = [
  "@repo/db",
  // NestJS optional peer deps (guarded require()s in @nestjs/core & /common)
  "@nestjs/microservices",
  "@nestjs/microservices/microservices-module",
  "@nestjs/websockets",
  "@nestjs/websockets/socket-module",
  "@nestjs/platform-socket.io",
  "class-validator",
  "class-transformer",
  "class-transformer/storage",
  "cache-manager",
  // native / optional
  "pg-native",
]

async function bundle(entry) {
  try {
    await access(entry)
  } catch {
    return // entry not present (e.g. tsc layout changed) — skip quietly
  }
  const tmp = `${entry}.bundle.cjs`
  await build({
    entryPoints: [entry],
    outfile: tmp,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external,
    keepNames: true, // preserve class/fn names for any name-based reflection
    logLevel: "info",
  })
  await rm(entry)
  await rename(tmp, entry)
  console.log(`bundled ${entry}`)
}

await bundle("dist/main.js")
await bundle("dist/auth/seed-admin.js")
