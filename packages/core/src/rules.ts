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
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, error: "title_too_long" };
  return { ok: true, title };
}

/** Open items newest first; completed items most recently completed first. */
export function groupAndOrder(items: readonly Todo[]): { open: Todo[]; completed: Todo[] } {
  const open = items.filter((t) => t.completedAt === null).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const completed = items.filter((t) => t.completedAt !== null).sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime());
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
  return `${ist.format(date).replace(/\b(am|pm)\b/i, (m) => m.toLowerCase())} IST`;
}
