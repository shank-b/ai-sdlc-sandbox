"use client";

import { useRef, useState, type FormEvent } from "react";
import { DeleteDialog } from "../delete-dialog/delete-dialog";
import { MAX_TITLE_LENGTH, formatIst, groupAndOrder, validateTitle } from "@core/rules";

// TODO(#2): green accent from the visual direction is left to hi-fi

export type TodoView = { id: string; title: string; createdAt: string; completedAt: string | null };

const SAVE_FAILED = "Couldn't save that change. Your list is unchanged.";

const fieldError = (e: "title_required" | "title_too_long") =>
  e === "title_required" ? "Title is required" : `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;

async function send(url: string, method: string, body?: unknown): Promise<Response | null> {
  try {
    return await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return null;
  }
}

export function TodoList({ initial }: { initial: TodoView[] }) {
  const [items, setItems] = useState(initial);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState<{ retry: () => void } | null>(null);
  const [confirming, setConfirming] = useState<{ id: string; title: string } | null>(null);
  const addingRef = useRef(false);
  const pending = useRef(new Set<string>());
  const field = useRef<HTMLInputElement>(null);

  const view = groupAndOrder(
    items.map((t) => ({ ...t, createdAt: new Date(t.createdAt), completedAt: t.completedAt ? new Date(t.completedAt) : null })),
  );

  async function add(raw: string) {
    if (addingRef.current) return;
    setFailure(null);
    const checked = validateTitle(raw);
    if (!checked.ok) {
      setTitleError(fieldError(checked.error));
      field.current?.focus();
      return;
    }
    setTitleError(null);
    addingRef.current = true;
    setAdding(true);
    const res = await send("/api/todos", "POST", { title: checked.title });
    addingRef.current = false;
    setAdding(false);
    if (res?.status === 201) {
      const created: TodoView | null = await res.json().catch(() => null);
      if (created) {
        setItems((prev) => [...prev, created]);
        setTitle("");
        return;
      }
    }
    if (res?.status === 400) {
      const { error } = await res.json().catch(() => ({ error: "" }));
      if (error === "title_required" || error === "title_too_long") {
        setTitleError(fieldError(error));
        field.current?.focus();
        return;
      }
    }
    setFailure({ retry: () => void add(field.current?.value ?? raw) });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void add(title);
  }

  async function toggle(id: string, completed: boolean) {
    const before = items.find((t) => t.id === id);
    if (!before || pending.current.has(id)) return;
    pending.current.add(id);
    setFailure(null);
    // optimistic: show the new state now, roll back if the save fails
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, completedAt: completed ? new Date().toISOString() : null } : t)));
    try {
      const res = await send(`/api/todos/${id}`, "PATCH", { completed });
      if (res?.status === 404) {
        // gone elsewhere (another tab); retrying can't help, so drop the row
        setItems((prev) => prev.filter((t) => t.id !== id));
        return;
      }
      const saved: TodoView | null = res?.ok ? await res.json().catch(() => null) : null;
      if (saved) {
        setItems((prev) => prev.map((t) => (t.id === id ? saved : t)));
        return;
      }
      setItems((prev) => prev.map((t) => (t.id === id ? before : t)));
      setFailure({ retry: () => void toggle(id, completed) });
    } finally {
      pending.current.delete(id);
    }
  }

  function closeDialog(id: string) {
    setConfirming(null);
    // the dialog is gone, so hand focus back to the row's Delete button (if the row survives)
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`li[data-id="${id}"] button.delete`)?.focus());
  }

  async function remove(id: string) {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    setFailure(null);
    try {
      const res = await send(`/api/todos/${id}`, "DELETE");
      // 404: already gone (another tab), which is the state the user asked for
      if (res?.status === 204 || res?.status === 404) {
        setItems((prev) => prev.filter((t) => t.id !== id));
        return;
      }
      setFailure({ retry: () => void remove(id) });
    } finally {
      pending.current.delete(id);
    }
  }

  const row = (t: (typeof view.open)[number]) => {
    const done = t.completedAt !== null;
    return (
      <li key={t.id} data-id={t.id} className={done ? "done" : undefined}>
        <label className="check">
          <input
            type="checkbox"
            checked={done}
            aria-label={done ? `Mark ${t.title} open` : `Mark ${t.title} done`}
            onChange={() => void toggle(t.id, !done)}
          />
          <span className="title">
            <span className="text">{t.title}</span>
            <small>
              {done ? "Done" : "Added"} {formatIst(done ? t.completedAt! : t.createdAt)}
            </small>
          </span>
        </label>
        <button type="button" className="delete" aria-label={`Delete ${t.title}`} onClick={() => setConfirming({ id: t.id, title: t.title })}>
          Delete
        </button>
      </li>
    );
  };

  return (
    <div className="list">
      <form className="add" onSubmit={onSubmit} noValidate>
        <label htmlFor="new-todo">New to-do</label>
        <input
          id="new-todo"
          ref={field}
          type="text"
          value={title}
          placeholder="What needs doing?"
          autoComplete="off"
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "new-todo-error" : undefined}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" disabled={adding}>
          Add
        </button>
        {titleError && (
          <p id="new-todo-error" className="field-error" role="alert">
            {titleError}
          </p>
        )}
      </form>

      {failure && (
        <div role="alert" className="save-error">
          {SAVE_FAILED}{" "}
          <button type="button" onClick={failure.retry}>
            Retry
          </button>
        </div>
      )}

      {items.length === 0 && <p className="empty">Nothing here yet. Add your first to-do above.</p>}

      {view.open.length > 0 && (
        <section>
          <h2>Open ({view.open.length})</h2>
          <ul>{view.open.map(row)}</ul>
        </section>
      )}
      {view.completed.length > 0 && (
        <section>
          <h2>Completed ({view.completed.length})</h2>
          <ul>{view.completed.map(row)}</ul>
        </section>
      )}
      {confirming && (
        <DeleteDialog
          title={confirming.title}
          onCancel={() => closeDialog(confirming.id)}
          onConfirm={() => {
            closeDialog(confirming.id);
            void remove(confirming.id);
          }}
        />
      )}
    </div>
  );
}
