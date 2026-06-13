import { isLocalHost, tenantHost } from "./tenant-url"

describe("tenantHost", () => {
  it("prepends the slug as a subdomain", () => {
    expect(tenantHost("localhost:3002", "acme")).toBe("acme.localhost:3002")
    expect(tenantHost("ica2.xyz", "acme")).toBe("acme.ica2.xyz")
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
