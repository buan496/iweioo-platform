import { NextRequest } from "next/server";
import { handleSessionListGet } from "@iweioo/auth-bff/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSessionListGet(request);
}
