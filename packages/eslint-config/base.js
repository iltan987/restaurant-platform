import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import turboPlugin from "eslint-plugin-turbo"
import unusedImports from "eslint-plugin-unused-imports"
import tseslint from "typescript-eslint"

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
  // Global ignores for this workspace (relative to workspace root)
  {
    ignores: [".turbo/**"],
  },
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  // Import ordering + unused-import removal (auto-fixable via `eslint --fix`).
  // Inherited by every workspace that spreads this config.
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      // Deterministic, grouped import order mirroring the monorepo layering:
      // side-effect → node builtins → external → @repo/* → @/* → relative.
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // Side-effect imports (kept in source order by the plugin).
            ["^\\u0000"],
            // Node.js builtins.
            ["^node:"],
            // External packages: scoped (non-@repo, non-@/) and bare.
            ["^@(?!repo/|/)\\w", "^\\w"],
            // Workspace packages.
            ["^@repo/"],
            // App-internal alias.
            ["^@/"],
            // Relative imports (parent dirs, then current dir).
            [
              "^\\.\\.(?!/?$)",
              "^\\.\\./?$",
              "^\\./(?=.*/[^/]*$)",
              "^\\.(?!/?$)",
              "^\\./?$",
            ],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
      // Remove unused imports (auto-fixable); defer unused-var handling to the
      // plugin to avoid double-reporting with @typescript-eslint/no-unused-vars.
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/no-deprecated": "warn",
    },
  },
]
