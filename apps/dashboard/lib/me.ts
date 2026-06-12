import { z } from "zod"

import { apiFetch } from "@repo/api-client"
import { tenantLocation, tenantMode } from "@repo/core"
import { type Membership, membershipSchema } from "@repo/schemas"

import { apiBase as API } from "./api-base"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3001"
const TENANT_MODE = tenantMode(process.env.NEXT_PUBLIC_TENANT_MODE)

const meSchema = z.object({ memberships: membershipSchema.array() })

/**
 * The signed-in user's restaurant memberships. Sent with credentials so the
 * dashboard session cookie reaches the API (browser→API); works on any host.
 */
export async function fetchMemberships(): Promise<Membership[]> {
  const { memberships } = await apiFetch(`${API}/me/restaurants`, meSchema, {
    credentials: "include",
    cache: "no-store",
  })
  return memberships
}

/** Absolute URL to a restaurant's dashboard (honours subdomain/path tenancy). */
export function restaurantHref(slug: string): string {
  const { host, path } = tenantLocation(ROOT_DOMAIN, slug, TENANT_MODE)
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "http:"
  return `${protocol}//${host}${path || "/"}`
}
