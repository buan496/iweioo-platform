import { NextRequest, NextResponse } from "next/server";
import { forwardPlatformRequest } from "@/lib/platform-proxy";
import { loadPlatformConfig } from "@/lib/platform-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = await forwardPlatformRequest(request, "/users/me/consents", "GET");
  if (!response.ok) {
    return response;
  }
  const consents: unknown = await response.json();
  return NextResponse.json(
    { consents, policies: loadPlatformConfig().consentPolicies },
    { headers: { "Cache-Control": "no-store" } }
  );
}
