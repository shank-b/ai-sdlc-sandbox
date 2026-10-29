"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

// A native modal <dialog>: it makes the page behind inert and Esc closes it; Tab is wrapped by hand
// because browsers otherwise let it escape to their own toolbar.
export function DeleteDialog({ title, onCancel, onConfirm }: { title: string; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    el.showModal();
    cancel.current?.focus(); // the safe choice is the default
  }, []);

  function trapTab(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog ref={dialog} className="confirm" aria-labelledby="delete-title" onClose={onCancel} onKeyDown={trapTab}>
      <h2 id="delete-title">Delete &ldquo;{title}&rdquo;?</h2>
      <p>This can&rsquo;t be undone.</p>
      <div className="actions">
        <button type="button" ref={cancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="danger" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </dialog>
  );
}
