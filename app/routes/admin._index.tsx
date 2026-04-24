import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/admin._index";
import { requireAdmin } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { tenants, diaries } from "../db/schema";
import { eq, sql, isNull, desc } from "drizzle-orm";

export function meta() {
  return [{ title: "Usuários - Administração" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  await requireAdmin(request, context.cloudflare.env.SESSION_SECRET, db);

  const url = new URL(request.url);
  const incluirDeletados = url.searchParams.get("incluirDeletados") === "1";

  const baseQuery = db
    .select({
      id: tenants.id,
      name: tenants.name,
      email: tenants.email,
      plan: tenants.plan,
      isAdmin: tenants.isAdmin,
      createdAt: tenants.createdAt,
      lastSeenAt: tenants.lastSeenAt,
      deletedAt: tenants.deletedAt,
      diaryCount: sql<number>`count(${diaries.id})::int`,
    })
    .from(tenants)
    .leftJoin(diaries, eq(diaries.tenantId, tenants.id))
    .groupBy(tenants.id)
    .orderBy(desc(tenants.createdAt));

  const users = incluirDeletados
    ? await baseQuery
    : await baseQuery.where(isNull(tenants.deletedAt));

  return { users, incluirDeletados };
}

function formatRelative(date: Date | null): string {
  if (!date) return "—";
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSec = Math.round((then - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  const absSec = Math.abs(diffSec);
  if (absSec < 60) return rtf.format(diffSec, "second");
  if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (absSec < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  if (absSec < 31536000)
    return rtf.format(Math.round(diffSec / 2592000), "month");
  return rtf.format(Math.round(diffSec / 31536000), "year");
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export default function AdminIndex() {
  const { users, incluirDeletados } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <div className="flex items-center gap-3">
          <Link
            to={
              incluirDeletados ? "/admin" : "/admin?incluirDeletados=1"
            }
            className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
          >
            {incluirDeletados ? "Ocultar excluídos" : "Mostrar excluídos"}
          </Link>
          <Link
            to="/admin/usuarios/novo"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            + Novo Usuário
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium text-center">Diários</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
                <th className="px-4 py-3 font-medium">Último acesso</th>
                <th className="px-4 py-3 font-medium text-center">Admin</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isDeleted = user.deletedAt !== null;
                  return (
                    <tr
                      key={user.id}
                      className={isDeleted ? "opacity-50" : ""}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {user.name}
                        {isDeleted && (
                          <span className="ml-2 text-xs text-red-600 font-normal">
                            (excluído)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3 text-gray-600">{user.plan}</td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {user.diaryCount}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td
                        className="px-4 py-3 text-gray-500"
                        title={
                          user.lastSeenAt
                            ? new Date(user.lastSeenAt).toLocaleString(
                                "pt-BR"
                              )
                            : ""
                        }
                      >
                        {formatRelative(user.lastSeenAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {user.isAdmin ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                            Sim
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            to={`/admin/usuarios/${user.id}/editar`}
                            className="text-violet-600 hover:text-violet-800 font-medium"
                          >
                            Editar
                          </Link>
                          <Link
                            to={`/admin/usuarios/${user.id}/senha`}
                            className="text-gray-500 hover:text-violet-600"
                          >
                            Senha
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
