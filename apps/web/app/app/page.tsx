import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  const { data: session } = await auth.getSession();

  return (
    <main>
      <h1>Igho</h1>
      <p>Signed in as {session?.user?.email}</p>
      <p>The production workspace shell will replace the static demo in M9/M10.</p>
    </main>
  );
}
