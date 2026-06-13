import { z } from "zod"

import { apiFetch } from "@repo/api-client"
import { tenantHost } from "@repo/core"
import { type Membership, membershipSchema } from "@repo/schemas"

import { apiBase as API } from "./api-base"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3001"

const meSchema = z.object({ memberships: membershipSchema.array() })

/**
 * The signed-in user's restaurant memberships. `apiFetch` includes credentials
 * by default, so the dashboard session cookie reaches the API (browser→API).
 */
export async function fetchMemberships(): Promise<Membership[]> {
  const { memberships } = await apiFetch(`${API}/me/restaurants`, meSchema, {
    cache: "no-store",
  })
  return memberships
}

/** Absolute URL to a restaurant's dashboard at `<slug>.<root>`. */
export function restaurantHref(slug: string): string {
  const host = tenantHost(ROOT_DOMAIN, slug)
  const protocol =
    typeof window !== "undefined" ? window.location.protocol : "http:"
  return `${protocol}//${host}/`
}
