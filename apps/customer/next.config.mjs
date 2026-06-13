// In dev, tenants are reached on subdomains (`<slug>.<root>`). Next blocks HMR
// from any origin not in `allowedDevOrigins`; `*.localhost` is a built-in
// default (so `<slug>.localhost` works), but a custom root like a nip.io/LAN
// host needs both the apex and its wildcard so every tenant subdomain's
// dev WebSocket is accepted. Wildcards match like image `remotePatterns`.
const devOrigin = process.env.ALLOWED_DEV_ORIGIN

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui"],
  ...(devOrigin && {
    allowedDevOrigins: [devOrigin, `*.${devOrigin}`],
  }),
}

export default nextConfig
