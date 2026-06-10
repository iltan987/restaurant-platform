import {
  defaultConfiguration,
  effectivePriceMinor,
  isValidGroupRule,
  type OptionGroupInput,
  validateConfiguration,
} from "./options"

// A "Pizza": required size (single), optional extras (multi, default Soğan).
const sizeGroup: OptionGroupInput = {
  id: "g-size",
  minSelect: 1,
  maxSelect: 1,
  required: true,
  options: [
    {
      id: "kucuk",
      priceDeltaMinor: 0,
      defaultSelected: false,
      isAvailable: true,
    },
    {
      id: "orta",
      priceDeltaMinor: 2000,
      defaultSelected: false,
      isAvailable: true,
    },
    {
      id: "buyuk",
      priceDeltaMinor: 4000,
      defaultSelected: false,
      isAvailable: true,
    },
  ],
}
const extrasGroup: OptionGroupInput = {
  id: "g-extras",
  minSelect: 0,
  maxSelect: null,
  required: false,
  options: [
    {
      id: "sogan",
      priceDeltaMinor: 0,
      defaultSelected: true,
      isAvailable: true,
    },
    {
      id: "mantar",
      priceDeltaMinor: 1500,
      defaultSelected: false,
      isAvailable: true,
    },
    {
      id: "peynir",
      priceDeltaMinor: 2500,
      defaultSelected: false,
      isAvailable: false,
    },
  ],
}
const groups = [sizeGroup, extrasGroup]
const BASE = 10000 // ₺100

describe("isValidGroupRule", () => {
  it("accepts consistent rules", () => {
    expect(
      isValidGroupRule({ minSelect: 1, maxSelect: 1, required: true })
    ).toBe(true)
    expect(
      isValidGroupRule({ minSelect: 0, maxSelect: null, required: false })
    ).toBe(true)
  })

  it("rejects maxSelect below minSelect, required-with-min-0, and bad numbers", () => {
    expect(
      isValidGroupRule({ minSelect: 3, maxSelect: 2, required: false })
    ).toBe(false)
    expect(
      isValidGroupRule({ minSelect: 0, maxSelect: 0, required: false })
    ).toBe(false)
    expect(
      isValidGroupRule({ minSelect: 0, maxSelect: null, required: true })
    ).toBe(false)
    expect(
      isValidGroupRule({ minSelect: -1, maxSelect: null, required: false })
    ).toBe(false)
  })
})

describe("defaultConfiguration", () => {
  it("selects available default-on options only", () => {
    expect(defaultConfiguration(groups)).toEqual(["sogan"])
  })
})

describe("effectivePriceMinor", () => {
  it("is the base price when nothing is selected", () => {
    expect(effectivePriceMinor(BASE, groups, [])).toBe(BASE)
  })

  it("adds the deltas of selected options (büyük, soğansız, +mantar)", () => {
    // büyük 4000 + mantar 1500, soğan removed (0) → 10000 + 5500
    expect(effectivePriceMinor(BASE, groups, ["buyuk", "mantar"])).toBe(15500)
  })

  it("treats a default-on zero-delta ingredient as free", () => {
    expect(effectivePriceMinor(BASE, groups, ["orta", "sogan"])).toBe(12000)
  })

  it("ignores unknown ids in pricing", () => {
    expect(effectivePriceMinor(BASE, groups, ["ghost"])).toBe(BASE)
  })
})

describe("validateConfiguration", () => {
  it("accepts a complete configuration", () => {
    expect(validateConfiguration(groups, ["buyuk", "mantar"])).toEqual({
      ok: true,
    })
  })

  it("rejects a missing required single-select (no size)", () => {
    expect(validateConfiguration(groups, ["mantar"])).toMatchObject({
      ok: false,
      groupId: "g-size",
      reason: "REQUIRED_GROUP_EMPTY",
    })
  })

  it("rejects exceeding maxSelect (two sizes)", () => {
    expect(validateConfiguration(groups, ["kucuk", "buyuk"])).toMatchObject({
      ok: false,
      groupId: "g-size",
      reason: "ABOVE_MAX_SELECT",
    })
  })

  it("rejects an unknown option id", () => {
    expect(validateConfiguration(groups, ["buyuk", "ghost"])).toMatchObject({
      ok: false,
      reason: "UNKNOWN_OPTION",
    })
  })

  it("rejects an unavailable option", () => {
    expect(validateConfiguration(groups, ["buyuk", "peynir"])).toMatchObject({
      ok: false,
      groupId: "g-extras",
      reason: "UNAVAILABLE_OPTION",
    })
  })

  it("enforces minSelect when a non-required group has selections", () => {
    const g: OptionGroupInput = {
      id: "g-pick2",
      minSelect: 2,
      maxSelect: 3,
      required: false,
      options: [
        {
          id: "a",
          priceDeltaMinor: 0,
          defaultSelected: false,
          isAvailable: true,
        },
        {
          id: "b",
          priceDeltaMinor: 0,
          defaultSelected: false,
          isAvailable: true,
        },
        {
          id: "c",
          priceDeltaMinor: 0,
          defaultSelected: false,
          isAvailable: true,
        },
      ],
    }
    expect(validateConfiguration([g], ["a"])).toMatchObject({
      ok: false,
      groupId: "g-pick2",
      reason: "BELOW_MIN_SELECT",
    })
    expect(validateConfiguration([g], [])).toEqual({ ok: true })
    expect(validateConfiguration([g], ["a", "b"])).toEqual({ ok: true })
  })
})
