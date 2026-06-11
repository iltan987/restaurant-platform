import { normalizeTr, type SearchableCategory, searchMenu } from "./menu-search"

describe("normalizeTr", () => {
  it("folds Turkish diacritics and case to ASCII", () => {
    expect(normalizeTr("Döner")).toBe("doner")
    expect(normalizeTr("İçecek")).toBe("icecek")
    expect(normalizeTr("ÇİĞ KÖFTE")).toBe("cig kofte")
    expect(normalizeTr("  Ayran  ")).toBe("ayran")
  })

  it("unifies dotted/dotless I without leaving a combining dot", () => {
    expect(normalizeTr("ISPANAK")).toBe("ispanak")
    expect(normalizeTr("ışık")).toBe("isik")
  })
})

const menu: SearchableCategory[] = [
  {
    name: "İçecekler",
    items: [
      { name: "Çay", tags: [{ label: "Sıcak" }] },
      { name: "Ayran", description: "Ev yapımı" },
    ],
  },
  {
    name: "Ana Yemekler",
    items: [
      { name: "Adana Kebap", description: "Acılı", tags: [{ label: "Acı" }] },
      { name: "Döner", tags: [] },
    ],
  },
]

describe("searchMenu", () => {
  it("returns the tree unchanged for a blank query", () => {
    expect(searchMenu(menu, "")).toBe(menu)
    expect(searchMenu(menu, "   ")).toBe(menu)
  })

  it("matches item names diacritic-insensitively", () => {
    const res = searchMenu(menu, "doner")
    expect(res).toHaveLength(1)
    expect(res[0]!.name).toBe("Ana Yemekler")
    expect(res[0]!.items.map((i) => i.name)).toEqual(["Döner"])
  })

  it("keeps every item when the category name matches", () => {
    const res = searchMenu(menu, "icecek")
    expect(res).toHaveLength(1)
    expect(res[0]!.items).toHaveLength(2)
  })

  it("matches on description and tags", () => {
    expect(searchMenu(menu, "ev yapımı")[0]!.items[0]!.name).toBe("Ayran")
    expect(searchMenu(menu, "aci")[0]!.items.map((i) => i.name)).toEqual([
      "Adana Kebap",
    ])
  })

  it("drops categories with no matching items", () => {
    expect(searchMenu(menu, "zzz")).toEqual([])
  })
})
