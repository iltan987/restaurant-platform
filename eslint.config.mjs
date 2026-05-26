// Root-level ESLint config for a Turborepo workspace.
// App/package lint rules live in each workspace's own eslint.config.mjs.
// This file only sets global ignores for when ESLint is run from the root.
// Note: node_modules and .git are already ignored by ESLint v9 by default.
/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ["**/.next/**", "**/.turbo/**", "**/next-env.d.ts"],
  },
]
