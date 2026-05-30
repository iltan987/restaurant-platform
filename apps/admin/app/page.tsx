"use client"

import { useEffect, useState } from "react"
import { z } from "zod"
import { createRestaurantSchema, type Restaurant } from "@repo/schemas"
import { getErrorMessage } from "../lib/messages"
import { Button } from "@repo/ui/components/button"

// Set Turkish locale for all Zod validation messages in the admin app
z.config(z.locales.tr())

const API = process.env.NEXT_PUBLIC_API_URL
const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL

/** Build the tenant URL by injecting the slug as a subdomain of DASHBOARD_URL */
function tenantUrl(slug: string): string {
  if (!DASHBOARD_URL) return "#"
  const url = new URL(DASHBOARD_URL)
  url.hostname = `${slug}.${url.hostname}`
  return url.toString().replace(/\/$/, "")
}

export default function Page() {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<string, string>>
  >({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch restaurant list whenever refreshKey changes
  useEffect(() => {
    let cancelled = false
    void fetch(`${API}/restaurants`)
      .then(
        (res): Promise<Restaurant[]> =>
          res.ok ? res.json() : Promise.resolve([])
      )
      .then((data) => {
        if (!cancelled) setRestaurants(data)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})
    setApiError(null)

    // Client-side validation — errors shown in Turkish via z.locales.tr()
    const result = createRestaurantSchema.safeParse({
      name,
      slug: slug.trim() || undefined,
    })
    if (!result.success) {
      const flat = z.flattenError(result.error)
      const errors: Partial<Record<string, string>> = {}
      for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
        const list = msgs as string[] | undefined
        if (list && list.length > 0) errors[key] = list[0]
      }
      setFieldErrors(errors)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/restaurants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { code?: string }
        setApiError(getErrorMessage(body?.code))
        return
      }

      setName("")
      setSlug("")
      setRefreshKey((k) => k + 1)
    } catch {
      setApiError("Sunucuya ulaşılamadı.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col gap-8 p-6">
      <div>
        <h1 className="text-lg font-medium">Restoran Ekle</h1>
        <p className="text-sm text-muted-foreground">
          Yeni bir restoran veya kafe oluşturun.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="name">
            Ad <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            className="rounded border px-3 py-1.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            placeholder="Restoran adı"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {fieldErrors["name"] && (
            <p className="text-xs text-red-600">{fieldErrors["name"]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" htmlFor="slug">
            Kısa ad{" "}
            <span className="font-normal text-muted-foreground">
              (isteğe bağlı)
            </span>
          </label>
          <input
            id="slug"
            className="rounded border px-3 py-1.5 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            placeholder="restoran-adi  —  otomatik oluşturulur"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          {fieldErrors["slug"] && (
            <p className="text-xs text-red-600">{fieldErrors["slug"]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {"URL'de kullanılır: "}
            <code>{`<kısa-ad>.${DASHBOARD_URL?.replace(/^https?:\/\//, "")}`}</code>
          </p>
        </div>

        {apiError && (
          <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiError}
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Ekleniyor…" : "Restoran Ekle"}
        </Button>
      </form>

      {restaurants.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium">Mevcut Restoranlar</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {restaurants.map((r) => (
              <li key={r.id} className="flex items-center gap-3">
                <span className="font-medium">{r.name}</span>
                <code className="text-xs text-muted-foreground">{r.slug}</code>
                <a
                  href={tenantUrl(r.slug)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline underline-offset-2"
                >
                  {"Aç ↗"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
