/**
 * Jest mock for react-email (`@react-email/components` + `@react-email/render`).
 * The real packages are ESM + JSX and can't load under Jest's CommonJS runtime
 * (same reason `better-auth` is mocked). Both packages map here via
 * `moduleNameMapper`. Templates render to "" in tests — specs assert on
 * behavior and captured links, never on rendered email HTML.
 *
 * If a template starts using a new react-email component, add it below.
 */
const Passthrough = ({ children }: { children?: unknown }): unknown =>
  children ?? null

// `@react-email/components`
export const Html = Passthrough
export const Head = Passthrough
export const Preview = Passthrough
export const Body = Passthrough
export const Container = Passthrough
export const Section = Passthrough
export const Heading = Passthrough
export const Text = Passthrough
export const Button = Passthrough
export const Link = Passthrough
export const Hr = Passthrough

// `@react-email/render`
export const render = async (): Promise<string> => ""
export const pretty = async (html: string): Promise<string> => html
export const toPlainText = (): string => ""
