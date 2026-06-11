import "dotenv/config"
import "reflect-metadata"

import { NestFactory } from "@nestjs/core"
import { z } from "zod"

import { AppModule } from "./app.module"

async function bootstrap() {
  // Backend always speaks English
  z.config(z.locales.en())

  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix("api")

  app.enableCors({ origin: buildCorsOrigins() })

  await app.listen(process.env.PORT ?? 3000, "0.0.0.0")
}

/**
 * Derives allowed CORS origins from ADMIN_URL and DASHBOARD_URL.
 * DASHBOARD_URL also covers tenant subdomains (<slug>.<host>).
 */
function buildCorsOrigins(): RegExp[] {
  const adminUrl = process.env.ADMIN_URL
  const dashboardUrl = process.env.DASHBOARD_URL

  const origins: RegExp[] = []

  if (adminUrl) {
    const { host } = new URL(adminUrl)
    const escapedHost = host.replace(/\./g, "\\.").replace(/:/g, "\\:")
    origins.push(new RegExp(`^https?:\\/\\/${escapedHost}$`))
  }

  if (dashboardUrl) {
    const { host } = new URL(dashboardUrl)
    const escapedHost = host.replace(/\./g, "\\.").replace(/:/g, "\\:")
    // apex
    origins.push(new RegExp(`^https?:\\/\\/${escapedHost}$`))
    // tenant subdomains
    origins.push(new RegExp(`^https?:\\/\\/[a-z0-9-]+\\.${escapedHost}$`))
  }

  return origins
}

bootstrap()
