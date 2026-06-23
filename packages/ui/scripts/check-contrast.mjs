/**
 * Deterministic WCAG-2 contrast audit for the design tokens in
 * `src/styles/globals.css`. Parses the `:root` (light) and `.dark` blocks,
 * resolves the foreground/background pairs below, and grades each against its
 * threshold. Exits non-zero on any failure so it can gate CI.
 *
 *   node scripts/check-contrast.mjs
 *
 * Thresholds (WCAG 2.1): 4.5:1 normal text, 3:1 large text / UI components.
 * Contrast is deterministic: color -> linear sRGB -> relative luminance ->
 * ratio = (L_lighter + 0.05) / (L_darker + 0.05).
 */
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const CSS = join(
  dirname(fileURLToPath(import.meta.url)),
  "../src/styles/globals.css"
)

// Foreground-on-background pairs to enforce, with the required ratio.
const PAIRS = [
  ["ink", "surface", 4.5],
  ["ink", "canvas", 4.5],
  ["ink-2", "surface", 4.5],
  ["ink-3", "surface", 4.5],
  ["ink-3", "surface-subtle", 4.5],
  ["ink-3", "surface-muted", 4.5],
  ["ink-4", "surface", 3.0],
  ["brand", "surface", 4.5],
  ["brand", "canvas", 4.5],
  ["brand", "brand-soft", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["success", "success-soft", 4.5],
  ["warning", "warning-soft", 4.5],
  ["danger", "danger-soft", 4.5],
  ["info", "info-soft", 4.5],
  ["success", "surface", 4.5],
  ["danger", "surface", 4.5],
]

// --- color math ---------------------------------------------------------
const oklchToLinear = (L, C, h) => {
  const hr = (h * Math.PI) / 180
  const a = C * Math.cos(hr)
  const b = C * Math.sin(hr)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}
const srgbToLinear = (c) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
const hexToLinear = (hex) => {
  const n = hex.replace("#", "")
  const v =
    n.length === 3
      ? n
          .split("")
          .map((x) => x + x)
          .join("")
      : n
  return [0, 2, 4].map((i) =>
    srgbToLinear(parseInt(v.slice(i, i + 2), 16) / 255)
  )
}
const luminance = ([r, g, b]) => {
  const [R, G, B] = [r, g, b].map((v) => Math.min(1, Math.max(0, v)))
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}
const linOf = (val) => {
  const m = val.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (m) return oklchToLinear(+m[1], +m[2], +m[3])
  if (val.startsWith("#")) return hexToLinear(val)
  return null // alpha colors / unsupported — skipped (borders, not text)
}
const ratio = (a, b) =>
  luminance(a) + 0.05 > luminance(b) + 0.05
    ? (luminance(a) + 0.05) / (luminance(b) + 0.05)
    : (luminance(b) + 0.05) / (luminance(a) + 0.05)

// --- parse the two token blocks ----------------------------------------
const css = readFileSync(CSS, "utf8")
const block = (selector) => {
  const start = css.indexOf(selector)
  const open = css.indexOf("{", start)
  const end = css.indexOf("\n}", open)
  const tokens = {}
  for (const line of css.slice(open + 1, end).split("\n")) {
    const m = line.match(/^\s*--([\w-]+):\s*(.+?);/)
    if (m) tokens[m[1]] = m[2].trim()
  }
  return tokens
}
const THEMES = { light: block(":root {"), dark: block(".dark {") }

// --- audit --------------------------------------------------------------
let failed = 0
for (const [theme, tokens] of Object.entries(THEMES)) {
  console.log(`\n  ${theme.toUpperCase()}`)
  for (const [fg, bg, min] of PAIRS) {
    const a = linOf(tokens[fg] ?? "")
    const b = linOf(tokens[bg] ?? "")
    if (!a || !b) {
      console.log(`  SKIP  ${fg} on ${bg} (unresolved)`)
      continue
    }
    const r = ratio(a, b)
    const ok = r >= min
    if (!ok) failed++
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (need ${min})  ${fg} on ${bg}`
    )
  }
}
console.log("")
if (failed) {
  // Throwing exits non-zero (no `process` needed) so this can gate CI.
  throw new Error(`${failed} contrast pair(s) below threshold`)
}
console.log("✓ all contrast pairs pass")
