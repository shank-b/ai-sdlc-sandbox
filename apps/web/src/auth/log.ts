/** Logs the route and the error class only: never messages, cookies, ids or secrets (AC5.5). */
export function logRouteError(route: string, err: unknown): void {
  console.error(`[${route}] ${err instanceof Error ? err.name : "UnknownError"}`);
}
