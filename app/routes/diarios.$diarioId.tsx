import { Outlet, Link, useLoaderData } from "react-router";
import type { Route } from "./+types/diarios.$diarioId";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries } from "../db/schema";
import { eq, and } from "drizzle-orm";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  const [diary] = await db
    .select({
      id: diaries.id,
      name: diaries.name,
      avatar: diaries.avatar,
    })
    .from(diaries)
    .where(and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId)));

  if (!diary) {
    throw new Response("Diário não encontrado", { status: 404 });
  }

  return { diary };
}

export default function DiarioLayout() {
  const { diary } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/diarios"
          className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
        >
          ← Diários
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-lg font-semibold text-gray-900">
          {diary.avatar || "📒"} {diary.name}
        </span>
        <Link
          to={`/diarios/${diary.id}/editar`}
          className="ml-auto text-sm text-gray-400 hover:text-violet-600 transition-colors"
        >
          Editar
        </Link>
      </div>
      <Outlet />
    </div>
  );
}
