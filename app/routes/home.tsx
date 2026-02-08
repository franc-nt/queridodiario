import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { createSessionStorage } from "../lib/sessions.server";
import { getUserId } from "../lib/auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const sessionStorage = createSessionStorage(
    context.cloudflare.env.SESSION_SECRET
  );
  const userId = await getUserId(request, sessionStorage);
  throw redirect(userId ? "/diarios" : "/login");
}
