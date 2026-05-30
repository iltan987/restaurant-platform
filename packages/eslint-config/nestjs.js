import globals from "globals"
import { config as baseConfig } from "./base.js"

/**
 * A shared ESLint configuration for NestJS applications.
 *
 * @type {import("eslint").Linter.Config}
 */
export const nestJsConfig = [
  ...baseConfig,
  { ignores: ["dist/**"] },
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: true },
    },
  },
]
