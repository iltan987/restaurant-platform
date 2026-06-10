import {
  type AvailabilityWindowInput,
  isOrderableNow,
  istanbulNow,
  isValidWindow,
  type ItemAvailability,
} from "./availability"

const at = (h: number, m = 0) => h * 60 + m

// Mon & Fri 15:00–16:00
const lunchMonFri: AvailabilityWindowInput = {
  days: ["MON", "FRI"],
  startMin: at(15),
  endMin: at(16),
}
// Mon 22:00 → Tue 02:00 (crosses midnight)
const lateMon: AvailabilityWindowInput = {
  days: ["MON"],
  startMin: at(22),
  endMin: at(2),
}

const inStock = (windows: AvailabilityWindowInput[]): ItemAvailability => ({
  inStock: true,
  windows,
})

describe("isValidWindow", () => {
  it("accepts a normal and a midnight-crossing window", () => {
    expect(isValidWindow(lunchMonFri)).toBe(true)
    expect(isValidWindow(lateMon)).toBe(true)
  })

  it("rejects empty days, out-of-range, or zero-length windows", () => {
    expect(isValidWindow({ days: [], startMin: 0, endMin: 60 })).toBe(false)
    expect(isValidWindow({ days: ["MON"], startMin: -1, endMin: 60 })).toBe(
      false
    )
    expect(isValidWindow({ days: ["MON"], startMin: 0, endMin: 1440 })).toBe(
      false
    )
    expect(isValidWindow({ days: ["MON"], startMin: 600, endMin: 600 })).toBe(
      false
    )
  })
})

describe("isOrderableNow", () => {
  it("is orderable inside a multi-day window (Mon 15:30)", () => {
    expect(
      isOrderableNow(inStock([lunchMonFri]), {
        day: "MON",
        minutes: at(15, 30),
      })
    ).toEqual({ ok: true })
  })

  it("is not orderable on a non-listed day (Tue 15:30) — outside window", () => {
    expect(
      isOrderableNow(inStock([lunchMonFri]), {
        day: "TUE",
        minutes: at(15, 30),
      })
    ).toEqual({ ok: false, reason: "OUTSIDE_WINDOW" })
  })

  it("is not orderable before the window starts (Mon 14:59)", () => {
    expect(
      isOrderableNow(inStock([lunchMonFri]), {
        day: "MON",
        minutes: at(14, 59),
      })
    ).toMatchObject({ ok: false, reason: "OUTSIDE_WINDOW" })
  })

  it("treats endMin as exclusive (Mon 16:00 is outside 15:00–16:00)", () => {
    expect(
      isOrderableNow(inStock([lunchMonFri]), { day: "MON", minutes: at(16) })
    ).toMatchObject({ ok: false })
  })

  describe("midnight-crossing (Mon 22:00–02:00)", () => {
    it("is orderable in the start segment (Mon 22:30)", () => {
      expect(
        isOrderableNow(inStock([lateMon]), { day: "MON", minutes: at(22, 30) })
      ).toEqual({ ok: true })
    })

    it("is orderable in the tail the next morning (Tue 01:00)", () => {
      expect(
        isOrderableNow(inStock([lateMon]), { day: "TUE", minutes: at(1) })
      ).toEqual({ ok: true })
    })

    it("is not orderable Tue evening (Tue is not a start day)", () => {
      expect(
        isOrderableNow(inStock([lateMon]), { day: "TUE", minutes: at(22, 30) })
      ).toMatchObject({ ok: false, reason: "OUTSIDE_WINDOW" })
    })
  })

  it("is always orderable with no windows when in stock", () => {
    expect(isOrderableNow(inStock([]), { day: "WED", minutes: at(3) })).toEqual(
      { ok: true }
    )
  })

  it("is never orderable when out of stock, even inside a window", () => {
    expect(
      isOrderableNow(
        { inStock: false, windows: [lunchMonFri] },
        { day: "MON", minutes: at(15, 30) }
      )
    ).toEqual({ ok: false, reason: "OUT_OF_STOCK" })
  })
})

describe("istanbulNow", () => {
  it("derives the Europe/Istanbul local day + minutes (UTC+3)", () => {
    // 2026-06-08 is a Monday. 10:30 UTC → 13:30 Istanbul.
    const now = istanbulNow(new Date("2026-06-08T10:30:00Z"))
    expect(now).toEqual({ day: "MON", minutes: at(13, 30) })
  })

  it("rolls the weekday forward across local midnight", () => {
    // Mon 22:00 UTC → Tue 01:00 Istanbul.
    const now = istanbulNow(new Date("2026-06-08T22:00:00Z"))
    expect(now).toEqual({ day: "TUE", minutes: at(1) })
  })
})
