import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@db/client";
import { getUser } from "../data";
import { SESSION_COOKIE, sessionSecret, verifySession } from "../auth/session";
import { SignOutButton } from "./auth/sign-out-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  // middleware already checked the signature; look the user up too (defence in depth)
  const userId = await verifySession((await cookies()).get(SESSION_COOKIE)?.value, sessionSecret());
  const user = userId ? await getUser(await getDb(), userId) : null;
  if (!user) redirect("/auth/signin");

  return (
    <main>
      <header className="session">
        <p>
          Signed in as <strong>{user.name}</strong>
        </p>
        <SignOutButton />
      </header>
      <h1>My to-dos</h1>
      <p>Nothing here yet.</p>
    </main>
  );
}
