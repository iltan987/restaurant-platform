import { unitPrice } from "./unit-price"

describe("unitPrice", () => {
  it("normalizes grams to a per-kg price (₺120 / 500 g → ₺240/kg)", () => {
    expect(unitPrice(12000, 500, "GRAM")).toEqual({
      perUnitMinor: 24000,
      unit: "kg",
    })
  })

  it("passes through kilograms", () => {
    expect(unitPrice(8000, 2, "KILOGRAM")).toEqual({
      perUnitMinor: 4000,
      unit: "kg",
    })
  })

  it("normalizes millilitres to a per-litre price (330 ml)", () => {
    // ₺33 / 330 ml → ₺100/L
    expect(unitPrice(3300, 330, "MILLILITER")).toEqual({
      perUnitMinor: 10000,
      unit: "L",
    })
  })

  it("passes through litres", () => {
    expect(unitPrice(5000, 1, "LITER")).toEqual({
      perUnitMinor: 5000,
      unit: "L",
    })
  })

  it("computes a per-piece price (adet)", () => {
    // ₺60 for 6 pieces → ₺10/adet
    expect(unitPrice(6000, 6, "PIECE")).toEqual({
      perUnitMinor: 1000,
      unit: "adet",
    })
  })

  it("rounds to the nearest kuruş", () => {
    // 1000 / 3 g * 1000 = 333333.33 → 333333
    expect(unitPrice(1000, 3, "GRAM")).toEqual({
      perUnitMinor: 333333,
      unit: "kg",
    })
  })

  it("returns null for PORTION, missing unit, or non-positive/empty amount", () => {
    expect(unitPrice(12000, 1, "PORTION")).toBeNull()
    expect(unitPrice(12000, 500, null)).toBeNull()
    expect(unitPrice(12000, null, "GRAM")).toBeNull()
    expect(unitPrice(12000, 0, "GRAM")).toBeNull()
    expect(unitPrice(12000, -5, "GRAM")).toBeNull()
  })
})
