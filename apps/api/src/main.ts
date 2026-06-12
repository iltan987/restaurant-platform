import "dotenv/config"
import "reflect-metadata"

import { NestFactory } from "@nestjs/core"
import express from "express"
import { z } from "zod"

import { mountAuthHandlers } from "./auth/auth.mount"
import { AppModule } from "./app.module"

async function bootstrap() {
  // Backend always speaks English
  z.config(z.locales.en())

  // Better Auth needs the raw request body, so Nest's global body parser is
  // disabled and re-enabled below for every route except the auth handlers.
  const app = await NestFactory.create(AppModule, { bodyParser: false })

  // Enable CORS first so it is registered ahead of the raw auth handlers and
  // their cross-origin responses (admin/dashboard/customer → api) carry the
  // headers. `credentials: true` is required for session cookies.
  app.enableCors({ origin: buildCorsOrigins(), credentials: true })

  // Mount the three Better Auth handlers (raw body) before JSON parsing.
  mountAuthHandlers(app)

  // Re-enable body parsing for the rest of the API. Auth routes mounted above
  // terminate their requests, so these never run for `/api/auth/*`.
  const expressApp = app.getHttpAdapter().getInstance()
  expressApp.use(express.json())
  expressApp.use(express.urlencoded({ extended: true }))

  app.setGlobalPrefix("api")

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
