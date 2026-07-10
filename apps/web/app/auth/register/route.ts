import { NextRequest } from "next/server";
import { handleAuthorizationStart } from "@/lib/auth/route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleAuthorizationStart(request, "register");
}
