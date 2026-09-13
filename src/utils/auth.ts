import { getSessionFromCtx } from "better-auth/api";
import { NextRequest } from "next/server";
import { UnauthorizedError } from "@/src/errors/app-error";
import { auth } from "@/lib/auth";
export async function getAuthenticatedUserId(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session?.user?.id) {
    throw new UnauthorizedError(
      "Authentication required",
    );
  }

  return session.user.id;
}
