// Next blocks dev HMR / `/_next/*` from any origin not in `allowedDevOrigins`.
// `localhost` is a built-in default; a custom LAN/nip.io host used to reach the
// dev server from another device must be listed explicitly. The wildcard keeps
// parity with the other apps (and covers any subdomain form of the host).
const devOrigin = process.env.ALLOWED_DEV_ORIGIN

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(devOrigin && {
    allowedDevOrigins: [devOrigin, `*.${devOrigin}`],
  }),
}

export default nextConfig
