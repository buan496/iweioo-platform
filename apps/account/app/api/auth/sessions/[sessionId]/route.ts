import { NextRequest } from "next/server";
import { handleSessionRevokeDelete } from "@iweioo/auth-bff/next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionRouteProps = {
  params: Promise<{ sessionId: string }>;
};

export async function DELETE(request: NextRequest, { params }: SessionRouteProps) {
  const { sessionId } = await params;
  return handleSessionRevokeDelete(request, sessionId);
}
