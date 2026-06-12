// Schema-generation shim — see ./admin.ts.
//   pnpm dlx auth@latest generate --config apps/api/src/auth/schema-gen/customer.ts \
//     --output packages/db/prisma/schema.prisma --yes
export { customerAuth as auth } from "../instances"
