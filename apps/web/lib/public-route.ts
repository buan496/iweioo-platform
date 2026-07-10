const SERVER_PREFIXES = ["/api", "/auth", "/_next"];

export function canonicalPublicPath(pathname: string): string | null {
  if (
    pathname === "/" ||
    pathname.endsWith("/") ||
    pathname.includes(".") ||
    SERVER_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  ) {
    return null;
  }
  return `${pathname}/`;
}
