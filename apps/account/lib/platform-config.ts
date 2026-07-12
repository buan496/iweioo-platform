import "server-only";

export type PlatformConfig = {
  baseUrl: URL;
  consentPolicies: Record<"agent_memory" | "growth_profile", string>;
};

const DEFAULT_PLATFORM_API_URL = "http://127.0.0.1:8000/v1/";
const DEFAULT_POLICY_VERSION = "beta-2026-07-10";

function safeServiceUrl(raw: string): URL {
  const url = new URL(raw.endsWith("/") ? raw : `${raw}/`);
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("PLATFORM_API_BASE_URL must use HTTPS or loopback HTTP without credentials");
  }
  return url;
}

function policyVersion(name: string): string {
  const value = process.env[name]?.trim() ?? DEFAULT_POLICY_VERSION;
  if (!value || value.length > 40) {
    throw new Error(`${name} must contain 1 to 40 characters`);
  }
  return value;
}

export function loadPlatformConfig(): PlatformConfig {
  return {
    baseUrl: safeServiceUrl(process.env.PLATFORM_API_BASE_URL ?? DEFAULT_PLATFORM_API_URL),
    consentPolicies: {
      agent_memory: policyVersion("CONSENT_POLICY_AGENT_MEMORY"),
      growth_profile: policyVersion("CONSENT_POLICY_GROWTH_PROFILE")
    }
  };
}
