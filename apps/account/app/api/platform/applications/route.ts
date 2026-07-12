import { NextRequest } from "next/server";
import { forwardPlatformRequest } from "@/lib/platform-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return forwardPlatformRequest(request, "/users/me/applications", "GET");
}
