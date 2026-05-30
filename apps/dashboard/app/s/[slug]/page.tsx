import { notFound } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL

interface Restaurant {
  id: string
  name: string
  slug: string
  status: "ACTIVE" | "INACTIVE"
}

export default async function TenantPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const res = await fetch(`${API}/restaurants/${slug}`, {
    cache: "no-store",
  })

  if (res.status === 404) notFound()

  if (!res.ok) {
    throw new Error(`Restoran bilgileri yüklenemedi (${res.status})`)
  }

  const restaurant = (await res.json()) as Restaurant

  // Inactive tenants are treated as not found
  if (restaurant.status !== "ACTIVE") notFound()

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-medium">Hoş geldiniz</h1>
        <p className="mt-1 text-muted-foreground">{restaurant.name}</p>
      </div>
    </div>
  )
}
