// Schema-generation shim — see ./admin.ts.
//   SKIP_ENV_VALIDATION=true pnpm dlx auth@latest generate \
//     --config apps/api/src/auth/schema-gen/customer.ts \
//     --output packages/db/prisma/schema.prisma --yes
export { customerAuth as auth } from "../instances"
