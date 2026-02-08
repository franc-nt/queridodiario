import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/diarios._index";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries } from "../db/schema";
import { eq } from "drizzle-orm";

export function meta() {
  return [{ title: "Diários - Querido Diário" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  const userDiaries = await db
    .select({
      id: diaries.id,
      name: diaries.name,
      avatar: diaries.avatar,
    })
    .from(diaries)
    .where(eq(diaries.tenantId, userId))
    .orderBy(diaries.createdAt);

  return { diaries: userDiaries };
}

export default function DiariosIndex() {
  const { diaries } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Diários</h1>
        <Link
          to="/diarios/novo"
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          + Novo Diário
        </Link>
      </div>

      {diaries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📒</p>
          <p className="text-gray-500 text-lg">Nenhum diário cadastrado.</p>
          <Link
            to="/diarios/novo"
            className="inline-block mt-4 text-violet-600 hover:text-violet-700 font-medium"
          >
            Criar primeiro diário
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {diaries.map((diary) => (
            <Link
              key={diary.id}
              to={`/diarios/${diary.id}`}
              className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-6 transition-all hover:-translate-y-0.5 group"
            >
              <div className="text-4xl mb-3">{diary.avatar || "📒"}</div>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                {diary.name}
              </h2>
              <p className="text-sm text-gray-400 mt-1">Ver rotinas →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
