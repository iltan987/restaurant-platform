import { tenantMode } from "@repo/core"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN
const TENANT_MODE = tenantMode(process.env.NEXT_PUBLIC_TENANT_MODE)

export default function Page() {
  const address =
    TENANT_MODE === "path"
      ? `${ROOT_DOMAIN}/s/<kısa-ad>`
      : `<kısa-ad>.${ROOT_DOMAIN}`

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">
        {"Restoranınıza şu adresten erişin: "}
        <code>{address}</code>
      </p>
    </div>
  )
}
