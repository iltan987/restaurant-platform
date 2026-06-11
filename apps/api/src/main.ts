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
 * Derives allowed CORS origins from ADMIN_URL, DASHBOARD_URL and CUSTOMER_URL.
 * The dashboard and customer apps are tenant-facing, so they're allowed on both
 * the apex host and `<slug>.<host>` tenant subdomains; admin is apex-only.
 */
function buildCorsOrigins(): RegExp[] {
  const origins: RegExp[] = []

  // Apex-host matcher for a configured URL (no-op when the env var is unset).
  const apex = (url: string | undefined) => {
    if (!url) return
    const { host } = new URL(url)
    const escapedHost = host.replace(/\./g, "\\.").replace(/:/g, "\\:")
    origins.push(new RegExp(`^https?:\\/\\/${escapedHost}$`))
  }

  // Apex + `<slug>.<host>` tenant subdomains for a configured URL.
  const apexAndSubdomains = (url: string | undefined) => {
    if (!url) return
    apex(url)
    const { host } = new URL(url)
    const escapedHost = host.replace(/\./g, "\\.").replace(/:/g, "\\:")
    origins.push(new RegExp(`^https?:\\/\\/[a-z0-9-]+\\.${escapedHost}$`))
  }

  apex(process.env.ADMIN_URL)
  apexAndSubdomains(process.env.DASHBOARD_URL)
  apexAndSubdomains(process.env.CUSTOMER_URL)

  return origins
}

bootstrap()
