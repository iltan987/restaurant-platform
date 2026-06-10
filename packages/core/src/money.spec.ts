import { formatPriceMinor, parsePriceToMinor } from "./money"

describe("formatPriceMinor", () => {
  it("formats kuruş as Turkish lira with comma decimals", () => {
    expect(formatPriceMinor(1000)).toBe("₺10,00")
    expect(formatPriceMinor(123456)).toBe("₺1.234,56")
    expect(formatPriceMinor(0)).toBe("₺0,00")
  })
})

describe("parsePriceToMinor", () => {
  it("parses comma- and dot-decimal major amounts into kuruş", () => {
    expect(parsePriceToMinor("10")).toBe(1000)
    expect(parsePriceToMinor("10,50")).toBe(1050)
    expect(parsePriceToMinor("10.50")).toBe(1050)
    expect(parsePriceToMinor("1.234,56")).toBe(123456)
    expect(parsePriceToMinor("₺10,5")).toBe(1050)
  })

  it("rounds to the nearest kuruş", () => {
    expect(parsePriceToMinor("10,999")).toBe(1100)
  })

  it("returns null for empty, invalid, or negative input", () => {
    expect(parsePriceToMinor("")).toBeNull()
    expect(parsePriceToMinor("abc")).toBeNull()
    expect(parsePriceToMinor("-5")).toBeNull()
  })
})
