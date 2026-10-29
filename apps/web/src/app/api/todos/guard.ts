import { getDb } from "@db/client";
import { getUser, type Todo } from "../../../data";
import { sameOrigin } from "../../../auth/origin";
import { sessionSecret, userIdFromCookieHeader } from "../../../auth/session";

export const fail = (status: number, error: string) => Response.json({ error }, { status });

/** What the client may see of an item: never the owner's id. */
export const publicTodo = (t: Todo) => ({
  id: t.id,
  title: t.title,
  completedAt: t.completedAt?.toISOString() ?? null,
  createdAt: t.createdAt.toISOString(),
});

/**
 * Every item route starts here: Origin check (CSRF), then a valid signed session for a user that
 * still exists. Returns the caller's user id, or the response to send.
 */
export async function authorize(req: Request): Promise<{ userId: string } | { response: Response }> {
  if (!sameOrigin(req)) return { response: fail(403, "forbidden") };
  const userId = await userIdFromCookieHeader(req.headers.get("cookie"), sessionSecret());
  const user = userId ? await getUser(await getDb(), userId) : null;
  if (!user) return { response: fail(401, "unauthorized") };
  return { userId: user.id };
}
