import { Controller, Get } from "@nestjs/common"

/**
 * Liveness probe. Public (no guard) and dependency-free so a platform health
 * check (e.g. Render) can confirm the process is up without touching the DB.
 * Mapped at `/api/health` via the global prefix.
 */
@Controller("health")
export class HealthController {
  @Get()
  check(): { status: "ok" } {
    return { status: "ok" }
  }
}
