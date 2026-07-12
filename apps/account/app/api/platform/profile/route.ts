import { NextRequest } from "next/server";
import { forwardPlatformRequest } from "@/lib/platform-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  return forwardPlatformRequest(request, "/users/me/profile", "PATCH");
}
