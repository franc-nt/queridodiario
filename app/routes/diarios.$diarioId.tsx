import { Outlet, Link, useLoaderData, useMatches } from "react-router";
import type { Route } from "./+types/diarios.$diarioId";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries } from "../db/schema";
import { eq, and } from "drizzle-orm";

export type Crumb = { label: string; href: string };

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  const { id: userId } = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET,
    db
  );

  const [diary] = await db
    .select({
      id: diaries.id,
      name: diaries.name,
      avatar: diaries.avatar,
      accessToken: diaries.accessToken,
    })
    .from(diaries)
    .where(and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId)));

  if (!diary) {
    throw new Response("Diário não encontrado", { status: 404 });
  }

  return { diary };
}

export const handle = {
  crumb: (data: { diary: { id: string; name: string; avatar: string | null } }): Crumb[] => [
    { label: "Diários", href: "/diarios" },
    {
      label: `${data.diary.avatar || "📒"} ${data.diary.name}`,
      href: `/diarios/${data.diary.id}`,
    },
  ],
};

export default function DiarioLayout() {
  const { diary } = useLoaderData<typeof loader>();
  const matches = useMatches();

  const crumbs: Crumb[] = matches.flatMap((match) => {
    const handle = match.handle as { crumb?: (data: unknown) => Crumb | Crumb[] } | undefined;
    if (!handle?.crumb) return [];
    const result = handle.crumb(match.data);
    return Array.isArray(result) ? result : [result];
  });

  const lastMatch = matches[matches.length - 1];
  const isDiaryIndex = lastMatch?.id?.endsWith("diarios.$diarioId._index");

  const parentCrumb = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;

  return (
    <div>
      <div className="max-w-4xl mx-auto mb-6">
        {parentCrumb && !isDiaryIndex && (
          <Link
            to={parentCrumb.href}
            className="text-sm text-gray-500 hover:text-violet-600 transition-colors inline-block mb-2"
          >
            ← {parentCrumb.label}
          </Link>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <span key={`${crumb.href}-${index}`} className="flex items-center gap-2">
                {isLast ? (
                  <span className="text-sm font-semibold text-gray-900">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.href}
                    className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
                {!isLast && <span className="text-gray-300">/</span>}
              </span>
            );
          })}
          {isDiaryIndex && (
            <Link
              to={`/diarios/${diary.id}/editar`}
              className="ml-auto text-sm text-gray-400 hover:text-violet-600 transition-colors"
            >
              Editar
            </Link>
          )}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
