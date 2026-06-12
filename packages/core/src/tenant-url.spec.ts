import { isLocalHost, tenantLocation, tenantMode } from "./tenant-url"

describe("tenantMode", () => {
  it('returns "path" only for the exact string "path"', () => {
    expect(tenantMode("path")).toBe("path")
  })

  it('defaults to "subdomain" for anything else', () => {
    expect(tenantMode(undefined)).toBe("subdomain")
    expect(tenantMode("")).toBe("subdomain")
    expect(tenantMode("subdomain")).toBe("subdomain")
    expect(tenantMode("PATH")).toBe("subdomain")
    expect(tenantMode("paths")).toBe("subdomain")
  })
})

describe("tenantLocation", () => {
  it("prepends the slug as a subdomain in subdomain mode", () => {
    expect(tenantLocation("localhost:3002", "acme", "subdomain")).toEqual({
      host: "acme.localhost:3002",
      path: "",
    })
    expect(tenantLocation("menu.example.com", "acme", "subdomain")).toEqual({
      host: "acme.menu.example.com",
      path: "",
    })
  })

  it("keeps the host and uses /s/<slug> in path mode", () => {
    expect(tenantLocation("customer-x.vercel.app", "acme", "path")).toEqual({
      host: "customer-x.vercel.app",
      path: "/s/acme",
    })
  })
})

describe("isLocalHost", () => {
  it("treats dev hosts as local (http)", () => {
    expect(isLocalHost("localhost")).toBe(true)
    expect(isLocalHost("localhost:3002")).toBe(true)
    expect(isLocalHost("acme.localhost:3002")).toBe(true)
    expect(isLocalHost("box.local")).toBe(true)
    expect(isLocalHost("192.168.2.154:3002")).toBe(true)
    expect(isLocalHost("10.0.0.1")).toBe(true)
    expect(isLocalHost("my-box.nip.io")).toBe(true)
    expect(isLocalHost("my-box.sslip.io")).toBe(true)
  })

  it("treats real domains as non-local (https)", () => {
    expect(isLocalHost("example.com")).toBe(false)
    expect(isLocalHost("customer-x.vercel.app")).toBe(false)
    expect(isLocalHost("menu.example.com")).toBe(false)
  })
})
