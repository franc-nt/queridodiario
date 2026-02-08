import type { Route } from "./+types/logout";
import { createSessionStorage } from "../lib/sessions.server";
import { destroyUserSession } from "../lib/auth.server";

export async function action({ request, context }: Route.ActionArgs) {
  const sessionStorage = createSessionStorage(
    context.cloudflare.env.SESSION_SECRET
  );
  return destroyUserSession(request, sessionStorage);
}

export async function loader() {
  return new Response(null, { status: 302, headers: { Location: "/login" } });
}
