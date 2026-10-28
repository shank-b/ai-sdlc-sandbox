"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountPicker({ accounts }: { accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  async function signIn(userId: string) {
    setFailed(false);
    try {
      const res = await fetch("/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.status !== 204) throw new Error("sign-in failed");
      router.replace("/");
      router.refresh();
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      {failed && <p role="alert">Sign-in failed. Pick an account to try again.</p>}
      <ul className="accounts">
        {accounts.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => signIn(a.id)}>
              Continue as {a.name}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
