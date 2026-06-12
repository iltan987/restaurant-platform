import { type INestApplication } from "@nestjs/common"
import { toNodeHandler } from "better-auth/node"
import type { Express } from "express"

import { adminAuth, customerAuth, dashboardAuth } from "./instances"

/**
 * Mounts the three Better Auth handlers on the raw Express instance (Express 5
 * splat syntax). Each is mounted at its real path — the Nest `/api` global
 * prefix only rewrites Nest controllers, not raw handlers — so the mounted path
 * equals each instance's `basePath` (and `BETTER_AUTH_URL` is the origin without
 * `/api`). `.all()` is used (not `.use()`) so Express does not strip the mount
 * prefix from `req.url`, which Better Auth needs intact to match its basePath.
 *
 * MUST run after CORS is enabled (so auth responses carry CORS headers) and
 * BEFORE `express.json()` (Better Auth needs the raw, unparsed body).
 */
export function mountAuthHandlers(app: INestApplication): void {
  const expressApp = app.getHttpAdapter().getInstance() as Express

  expressApp.all("/api/auth/admin/*splat", toNodeHandler(adminAuth))
  expressApp.all("/api/auth/dashboard/*splat", toNodeHandler(dashboardAuth))
  expressApp.all("/api/auth/customer/*splat", toNodeHandler(customerAuth))
}
