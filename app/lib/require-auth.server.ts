import { redirect } from "react-router";
import { createSessionStorage } from "./sessions.server";
import { getUserId } from "./auth.server";

/**
 * Exige autenticacao. Retorna o userId ou redireciona para /login.
 * Uso nos loaders/actions:
 *   const userId = await requireAuth(request, context.cloudflare.env.SESSION_SECRET);
 */
export async function requireAuth(
  request: Request,
  sessionSecret: string
): Promise<string> {
  const sessionStorage = createSessionStorage(sessionSecret);
  const userId = await getUserId(request, sessionStorage);

  if (!userId) {
    throw redirect("/login");
  }

  return userId;
}
