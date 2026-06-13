// Next blocks dev HMR / `/_next/*` from any origin not in `allowedDevOrigins`.
// `localhost` is a built-in default; a custom LAN/nip.io host used to reach the
// dev server from another device must be listed explicitly. The wildcard keeps
// parity with the other apps (and covers any subdomain form of the host).
const devOrigin = process.env.ALLOWED_DEV_ORIGIN

// In prod the API runs on a different host (Render). Proxy `/api/*` from this
// app's own origin to it so the session cookie is first-party (same site as the
// app) and persists in every browser, incl. Safari. Unset in dev → the app
// calls the API directly (same-site localhost), so no proxy is needed.
const apiOrigin = process.env.API_ORIGIN

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(devOrigin && {
    allowedDevOrigins: [devOrigin, `*.${devOrigin}`],
  }),
  ...(apiOrigin && {
    async rewrites() {
      return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }]
    },
  }),
}

export default nextConfig
