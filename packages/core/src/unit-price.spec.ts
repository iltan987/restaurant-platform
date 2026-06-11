import { resolveUnitPrice } from "./unit-price"

describe("resolveUnitPrice — AUTO", () => {
  it("keeps cheap weights per-kg (₺120 / 500 g → ₺240/kg, under threshold)", () => {
    expect(resolveUnitPrice(12000, 500, "GRAM")).toEqual({
      perUnitMinor: 24000,
      unit: "kg",
    })
  })

  it("switches pricey weights to per-100 g (₺385 / 400 g → ₺96,25/100 g)", () => {
    // perKg = 96 250 ≥ 30 000 → per-100 g = 9 625
    expect(resolveUnitPrice(38500, 400, "GRAM")).toEqual({
      perUnitMinor: 9625,
      unit: "100 g",
    })
  })

  it("treats kilograms like grams for the threshold", () => {
    // ₺80 / 2 kg → ₺40/kg, under threshold
    expect(resolveUnitPrice(8000, 2, "KILOGRAM")).toEqual({
      perUnitMinor: 4000,
      unit: "kg",
    })
  })

  it("shows a per-litre price for a sensible volume (330 ml)", () => {
    // ₺33 / 330 ml → ₺100/L
    expect(resolveUnitPrice(3300, 330, "MILLILITER")).toEqual({
      perUnitMinor: 10000,
      unit: "L",
    })
  })

  it("hides the unit price for a tiny volume (Turkish coffee, 80 ml)", () => {
    expect(resolveUnitPrice(4500, 80, "MILLILITER")).toBeNull()
  })

  it("computes a per-piece price only when there's more than one piece", () => {
    expect(resolveUnitPrice(6000, 6, "PIECE")).toEqual({
      perUnitMinor: 1000,
      unit: "adet",
    })
    expect(resolveUnitPrice(6000, 1, "PIECE")).toBeNull()
  })

  it("returns null for PORTION, missing unit, or non-positive/empty amount", () => {
    expect(resolveUnitPrice(12000, 1, "PORTION")).toBeNull()
    expect(resolveUnitPrice(12000, 500, null)).toBeNull()
    expect(resolveUnitPrice(12000, null, "GRAM")).toBeNull()
    expect(resolveUnitPrice(12000, 0, "GRAM")).toBeNull()
    expect(resolveUnitPrice(12000, -5, "GRAM")).toBeNull()
  })
})

describe("resolveUnitPrice — explicit basis", () => {
  it("HIDE suppresses the unit price", () => {
    expect(resolveUnitPrice(38500, 400, "GRAM", "HIDE")).toBeNull()
  })

  it("forces per-kg even when AUTO would pick per-100 g", () => {
    expect(resolveUnitPrice(38500, 400, "GRAM", "PER_KG")).toEqual({
      perUnitMinor: 96250,
      unit: "kg",
    })
  })

  it("forces per-100 ml on a volume item", () => {
    // ₺33 / 330 ml → ₺10/100 ml
    expect(resolveUnitPrice(3300, 330, "MILLILITER", "PER_100ML")).toEqual({
      perUnitMinor: 1000,
      unit: "100 ml",
    })
  })

  it("falls back to AUTO when the explicit basis doesn't fit the unit", () => {
    // PER_L on a weight item is incompatible → AUTO (per-100 g here)
    expect(resolveUnitPrice(38500, 400, "GRAM", "PER_L")).toEqual({
      perUnitMinor: 9625,
      unit: "100 g",
    })
  })
})
