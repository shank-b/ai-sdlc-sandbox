export const MAX_TITLE_LENGTH = 140;

export type Todo = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  completedAt: Date | null;
};

export type TitleResult = { ok: true; title: string } | { ok: false; error: "title_required" | "title_too_long" };

export function validateTitle(raw: string): TitleResult {
  const title = raw.trim();
  if (title.length === 0) return { ok: false, error: "title_required" };
  // code points, to match Postgres char_length
  if ([...title].length > MAX_TITLE_LENGTH) return { ok: false, error: "title_too_long" };
  return { ok: true, title };
}

/** Open items newest first; completed items most recently completed first. Ties break by id. */
export function groupAndOrder<T extends Pick<Todo, "id" | "createdAt" | "completedAt">>(items: readonly T[]): { open: T[]; completed: T[] } {
  const byId = (a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const open = items.filter((t) => t.completedAt === null).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || byId(a, b));
  const completed = items.filter((t) => t.completedAt !== null).sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime() || byId(a, b));
  return { open, completed };
}

export function canAccess(ownerId: string, requesterId: string): boolean {
  return ownerId !== "" && ownerId === requesterId;
}

export function filterByOwner<T extends { userId: string }>(items: readonly T[], userId: string): T[] {
  return items.filter((t) => canAccess(t.userId, userId));
}

const ist = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function formatIst(date: Date): string {
  const p = Object.fromEntries(ist.formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod.toLowerCase()} IST`;
}
