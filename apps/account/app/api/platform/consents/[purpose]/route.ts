import { NextRequest } from "next/server";
import { forwardPlatformRequest } from "@/lib/platform-proxy";
import { loadPlatformConfig } from "@/lib/platform-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConsentRouteProps = {
  params: Promise<{ purpose: string }>;
};

export async function PUT(request: NextRequest, { params }: ConsentRouteProps) {
  const { purpose } = await params;
  const policies = loadPlatformConfig().consentPolicies;
  if (!Object.hasOwn(policies, purpose)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return forwardPlatformRequest(
    request,
    `/users/me/consents/${encodeURIComponent(purpose)}`,
    "PUT"
  );
}
