/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.ALLOWED_DEV_ORIGIN && {
    allowedDevOrigins: [process.env.ALLOWED_DEV_ORIGIN],
  }),
}

export default nextConfig
