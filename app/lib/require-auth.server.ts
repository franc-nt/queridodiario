import { redirect } from "react-router";
import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { tenants } from "../db/schema";
import { createSessionStorage } from "./sessions.server";
import { getUserId } from "./auth.server";

export type AuthedUser = { id: string; isAdmin: boolean };

/**
 * Exige autenticacao. Retorna { id, isAdmin } ou redireciona para /login.
 * Atualiza lastSeenAt (fire-and-forget).
 * Uso:
 *   const user = await requireAuth(request, env.SESSION_SECRET, db);
 */
export async function requireAuth(
  request: Request,
  sessionSecret: string,
  db: Database
): Promise<AuthedUser> {
  const sessionStorage = createSessionStorage(sessionSecret);
  const userId = await getUserId(request, sessionStorage);

  if (!userId) {
    throw redirect("/login");
  }

  const tenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.id, userId), isNull(tenants.deletedAt)),
  });

  if (!tenant) {
    throw redirect("/logout");
  }

  // Carimbar último acesso — não bloquear a request se falhar
  db.update(tenants)
    .set({ lastSeenAt: new Date() })
    .where(eq(tenants.id, userId))
    .catch(() => {});

  return { id: tenant.id, isAdmin: tenant.isAdmin };
}

/**
 * Exige autenticacao E que o usuario seja admin. Lanca 403 caso nao seja.
 */
export async function requireAdmin(
  request: Request,
  sessionSecret: string,
  db: Database
): Promise<AuthedUser> {
  const user = await requireAuth(request, sessionSecret, db);
  if (!user.isAdmin) {
    throw new Response("Acesso negado", { status: 403 });
  }
  return user;
}
