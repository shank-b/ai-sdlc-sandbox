import { getDb } from "@db/client";
import { listUsers } from "../../../data";
import { AccountPicker } from "./account-picker";

export const dynamic = "force-dynamic";

// TODO(#2): dev-only sign-in from a local seed file; no passwords
export default async function SignIn() {
  const users = await listUsers(await getDb());
  return (
    <main>
      <h1>Who are you?</h1>
      {users.length === 0 ? (
        <p>No accounts set up. Add accounts to your local seed file.</p>
      ) : (
        <>
          <p>Pick your account (dev-only sign-in).</p>
          <AccountPicker accounts={users.map((u) => ({ id: u.id, name: u.name }))} />
        </>
      )}
    </main>
  );
}
