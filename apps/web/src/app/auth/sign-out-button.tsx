"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await fetch("/auth/session", { method: "DELETE" });
    router.replace("/auth/signin");
    router.refresh();
  }
  return (
    <button type="button" onClick={signOut}>
      Sign out
    </button>
  );
}
