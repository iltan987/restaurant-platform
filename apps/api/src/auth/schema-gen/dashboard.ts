// Schema-generation shim — see ./admin.ts.
//   pnpm dlx auth@latest generate --config apps/api/src/auth/schema-gen/dashboard.ts \
//     --output packages/db/prisma/schema.prisma --yes
export { dashboardAuth as auth } from "../instances"
