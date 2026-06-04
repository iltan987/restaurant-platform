// Commit-time processing — runs only on staged files (low overhead).
// ESLint resolves each file's nearest workspace eslint.config.mjs via the
// `v10_config_lookup_from_file` flag (the ESLint 10 default; drop the flag on
// the v10 upgrade). `--no-warn-ignored` silences warnings for workspace-ignored
// paths (e.g. **/src/generated/**). Prettier honors .prettierignore.
export default {
  "*.{ts,tsx,mts,cts}": [
    "eslint --fix --no-warn-ignored --flag v10_config_lookup_from_file",
    "prettier --write",
  ],
  "*.{js,jsx,mjs,cjs,json,md,css,yaml,yml}": "prettier --write",
}
