import "dotenv/config"
import "reflect-metadata"
import { z } from "zod"
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

async function bootstrap() {
  // Backend always speaks English
  z.config(z.locales.en())

  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix("api")

  app.enableCors({ origin: buildCorsOrigins() })

  await app.listen(process.env.PORT ?? 3000)
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
    origins.push(urlToExactOriginRegex(adminUrl))
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

function urlToExactOriginRegex(rawUrl: string): RegExp {
  const { protocol, host } = new URL(rawUrl)
  const escapedProtocol = protocol.replace(/\./g, "\\.").replace(/:/g, "\\:")
  const escapedHost = host.replace(/\./g, "\\.").replace(/:/g, "\\:")
  return new RegExp(`^${escapedProtocol}\\/\\/${escapedHost}$`)
}

bootstrap()
