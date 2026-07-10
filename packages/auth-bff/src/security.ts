import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function randomHandle(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashHandle(handle: string): string {
  return createHash("sha256").update(handle, "utf8").digest("base64url");
}

export function safeReturnPath(candidate: string | null | undefined, fallback = "/"): string {
  if (!candidate || candidate.length > 512) {
    return fallback;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://return-path.invalid");
    return parsed.origin === "https://return-path.invalid"
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isSameOriginPost(request: Request, expectedOrigin: string): boolean {
  if (request.method !== "POST" || request.headers.get("origin") !== expectedOrigin) {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}
