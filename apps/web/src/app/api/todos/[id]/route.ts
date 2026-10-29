import { getDb } from "@db/client";
import { deleteTodo, setCompleted } from "../../../../data";
import { logRouteError } from "../../../../auth/log";
import { authorize, fail, publicTodo } from "../guard";

type Ctx = { params: Promise<{ id: string }> };

// A foreign id and a missing id both answer 404 with the same body (ADR 0003).
const notFound = () => fail(404, "not_found");

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req);
    if ("response" in auth) return auth.response;

    const body: unknown = await req.json().catch(() => null);
    const completed = (body as { completed?: unknown } | null)?.completed;
    if (typeof completed !== "boolean") return fail(400, "invalid_body");

    const todo = await setCompleted(await getDb(), auth.userId, (await params).id, completed);
    return todo ? Response.json(publicTodo(todo)) : notFound();
  } catch (e) {
    logRouteError("PATCH /api/todos/:id", e);
    return fail(500, "server_error");
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const auth = await authorize(req);
    if ("response" in auth) return auth.response;

    const removed = await deleteTodo(await getDb(), auth.userId, (await params).id);
    return removed ? new Response(null, { status: 204 }) : notFound();
  } catch (e) {
    logRouteError("DELETE /api/todos/:id", e);
    return fail(500, "server_error");
  }
}
