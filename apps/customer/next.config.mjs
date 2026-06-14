// In dev, tenants are reached on subdomains (`<slug>.<root>`). Next blocks HMR
// from any origin not in `allowedDevOrigins`; `*.localhost` is a built-in
// default (so `<slug>.localhost` works), but a custom root like a nip.io/LAN
// host needs both the apex and its wildcard so every tenant subdomain's
// dev WebSocket is accepted. Wildcards match like image `remotePatterns`.
const devOrigin = process.env.ALLOWED_DEV_ORIGIN

// `next/image` only optimizes remote hosts on a build-time allowlist, so the
// media host (MinIO in dev, R2 in prod) must be known here. Read the same
// `MEDIA_PUBLIC_BASE_URL` the API serves media from — like the dev origin, it
// can't come from env.ts (this file can't import the TS module).
const mediaBase = process.env.MEDIA_PUBLIC_BASE_URL
const mediaUrl = mediaBase ? new URL(mediaBase) : null

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/ui"],
  ...(devOrigin && {
    allowedDevOrigins: [devOrigin, `*.${devOrigin}`],
  }),
  ...(mediaUrl && {
    images: {
      remotePatterns: [
        {
          protocol: mediaUrl.protocol.replace(":", ""),
          hostname: mediaUrl.hostname,
          port: mediaUrl.port,
          pathname: "/**",
        },
      ],
    },
  }),
}

export default nextConfig
