import { getDb } from "@db/client";
import { getUser } from "../../../data";
import { logRouteError } from "../../../auth/log";
import { sameOrigin } from "../../../auth/origin";
import { clearedSessionCookie, sessionCookie, sessionSecret, signSession } from "../../../auth/session";

const secure = () => process.env.NODE_ENV === "production";
const noContent = (cookie: string) => new Response(null, { status: 204, headers: { "set-cookie": cookie } });
const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  try {
    const body: unknown = await req.json().catch(() => null);
    const userId = (body as { userId?: unknown } | null)?.userId;
    const user = typeof userId === "string" ? await getUser(await getDb(), userId) : null;
    if (!user) return fail(401, "sign_in_failed");
    return noContent(sessionCookie(await signSession(user.id, sessionSecret()), secure()));
  } catch (e) {
    logRouteError("POST /auth/session", e);
    return fail(500, "server_error");
  }
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail(403, "forbidden");
  return noContent(clearedSessionCookie(secure()));
}
