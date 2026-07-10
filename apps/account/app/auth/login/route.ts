import { NextRequest } from "next/server";
import { handleAuthorizationStart } from "@iweioo/auth-bff/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleAuthorizationStart(request, "login");
}
