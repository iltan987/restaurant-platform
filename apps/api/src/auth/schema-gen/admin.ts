// Schema-generation shim. The Better Auth CLI resolves a single `auth` export
// per `--config` file, so each instance is generated separately and the runs
// accumulate into packages/db/prisma/schema.prisma. See tasks T006.
//   SKIP_ENV_VALIDATION=true pnpm dlx auth@latest generate \
//     --config apps/api/src/auth/schema-gen/admin.ts \
//     --output packages/db/prisma/schema.prisma --yes
export { adminAuth as auth } from "../instances"
