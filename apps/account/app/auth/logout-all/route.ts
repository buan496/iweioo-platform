import { NextRequest } from "next/server";
import { handleLogoutAllPost } from "@iweioo/auth-bff/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleLogoutAllPost(request);
}
