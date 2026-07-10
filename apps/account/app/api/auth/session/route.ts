import { NextRequest } from "next/server";
import { handleSessionGet } from "@iweioo/auth-bff/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleSessionGet(request);
}
