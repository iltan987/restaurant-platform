// Next blocks dev HMR / `/_next/*` from any origin not in `allowedDevOrigins`.
// `localhost` is a built-in default; a custom LAN/nip.io host used to reach the
// dev server from another device must be listed explicitly. The wildcard keeps
// parity with the other apps (and covers any subdomain form of the host).
const devOrigin = process.env.ALLOWED_DEV_ORIGIN

// `next/image` only optimizes remote hosts on a build-time allowlist, so the
// media host (MinIO in dev, R2 in prod) must be known here. Read the same
// `MEDIA_PUBLIC_BASE_URL` the API serves media from — like the dev origin, it
// can't come from env.ts (this file can't import the TS module).
const mediaBase = process.env.MEDIA_PUBLIC_BASE_URL
const mediaUrl = mediaBase ? new URL(mediaBase) : null

/** @type {import('next').NextConfig} */
const nextConfig = {
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
