import { Map, QrCode, Users, UtensilsCrossed } from "lucide-react"

const FEATURES = [
  {
    icon: Map,
    title: "Canlı kat planı",
    body: "Masaları gerçek zamanlı takip edin, taşıyın ve birleştirin.",
  },
  {
    icon: QrCode,
    title: "QR menü & sipariş",
    body: "Her masaya özel QR ile dijital menüye anında erişim.",
  },
  {
    icon: Users,
    title: "Ekip ve roller",
    body: "Personeli davet edin, yetkileri rol bazında yönetin.",
  },
]

/**
 * Split-screen frame for the pre-login surfaces (sign-in, invitation accept).
 * A value panel on the left (hidden on small screens), the form on the right.
 * Intentionally nameless — the project carries no product name.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* ── value panel ── */}
      <aside className="relative hidden flex-col overflow-hidden border-r bg-muted/40 p-12 lg:flex">
        {/* faint table-map dot motif */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, color-mix(in oklch, var(--foreground) 8%, transparent) 1px, transparent 1.6px)",
            backgroundSize: "30px 30px",
            maskImage: "linear-gradient(160deg, transparent 38%, #000 96%)",
            WebkitMaskImage:
              "linear-gradient(160deg, transparent 38%, #000 96%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_85%_-10%,var(--primary)/8%,transparent_60%)]"
        />

        <div className="relative flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <UtensilsCrossed className="size-5" />
        </div>

        <div className="relative my-auto max-w-md">
          <p className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">
            Restoran yönetimi
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
            Masalarınız, alanlarınız ve siparişleriniz tek panelde.
          </h2>

          <ul className="mt-9 flex flex-col gap-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-primary shadow-xs">
                  <Icon className="size-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Hesaplar davet ile açılır · e-posta + parola
        </p>
      </aside>

      {/* ── form column ── */}
      <div className="flex items-center justify-center overflow-y-auto p-6 sm:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  )
}
