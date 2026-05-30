const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">
        {"Restoranınıza şu adresten erişin: "}
        <code>{`<kısa-ad>.${ROOT_DOMAIN}`}</code>
      </p>
    </div>
  )
}
