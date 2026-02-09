import { Outlet, Link, useLoaderData } from "react-router";
import { useState } from "react";
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
      accessToken: diaries.accessToken,
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
  const [copied, setCopied] = useState(false);

  const panelUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/painel#token=${diary.accessToken}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(panelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById(
        "panel-link-header"
      ) as HTMLInputElement | null;
      if (input) {
        input.select();
      }
    }
  };

  return (
    <div>
      <div className="max-w-4xl mx-auto flex items-center gap-3 mb-6">
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

      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-500 mb-2">
            Link de acesso ao painel (sem login)
          </p>
          <div className="flex gap-2 items-center">
            <input
              id="panel-link-header"
              type="text"
              readOnly
              value={panelUrl}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-600 bg-gray-50 truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 font-medium rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
