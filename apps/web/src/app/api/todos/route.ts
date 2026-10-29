import { getDb } from "@db/client";
import { validateTitle } from "@core/rules";
import { addTodo } from "../../../data";
import { logRouteError } from "../../../auth/log";
import { authorize, fail, publicTodo } from "./guard";

export async function POST(req: Request) {
  try {
    const auth = await authorize(req);
    if ("response" in auth) return auth.response;

    const body: unknown = await req.json().catch(() => null);
    const raw = (body as { title?: unknown } | null)?.title;
    const result = validateTitle(typeof raw === "string" ? raw : "");
    if (!result.ok) return fail(400, result.error);

    return Response.json(publicTodo(await addTodo(await getDb(), auth.userId, result.title)), { status: 201 });
  } catch (e) {
    logRouteError("POST /api/todos", e);
    return fail(500, "server_error");
  }
}
