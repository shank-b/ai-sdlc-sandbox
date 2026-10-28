"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountPicker({ accounts }: { accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signIn(userId: string) {
    setFailed(false);
    setBusy(true);
    let ok = false;
    try {
      const res = await fetch("/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      ok = res.status === 204;
    } catch {
      ok = false;
    }
    if (!ok) {
      setFailed(true);
      setBusy(false);
      return;
    }
    // stay disabled while navigating, so a second click can't swap the account
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      {failed && <p role="alert">Sign-in failed. Pick an account to try again.</p>}
      <ul className="accounts">
        {accounts.map((a) => (
          <li key={a.id}>
            <button type="button" disabled={busy} onClick={() => signIn(a.id)}>
              Continue as {a.name}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
