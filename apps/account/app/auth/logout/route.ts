import { NextRequest } from "next/server";
import { handleLogoutPost } from "@iweioo/auth-bff/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleLogoutPost(request);
}
