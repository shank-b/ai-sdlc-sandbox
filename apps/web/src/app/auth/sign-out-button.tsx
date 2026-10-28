"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setFailed(false);
    setBusy(true);
    let ok = false;
    try {
      ok = (await fetch("/auth/session", { method: "DELETE" })).status === 204;
    } catch {
      ok = false;
    }
    if (!ok) {
      setFailed(true);
      setBusy(false);
      return;
    }
    router.replace("/auth/signin");
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={signOut} disabled={busy}>
        Sign out
      </button>
      {failed && <p role="alert">Couldn&apos;t sign out. Try again.</p>}
    </>
  );
}
