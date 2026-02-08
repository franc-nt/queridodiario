import {
  redirect,
  Form,
  Link,
  useActionData,
  useNavigation,
  useParams,
} from "react-router";
import type { Route } from "./+types/diarios.$diarioId.rotinas.nova";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries, routines } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export function meta() {
  return [{ title: "Nova Rotina - Querido Diário" }];
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  // Verificar ownership do diário
  const [diary] = await db
    .select({ id: diaries.id })
    .from(diaries)
    .where(and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId)));

  if (!diary) {
    throw new Response("Diário não encontrado", { status: 404 });
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || "📋";

  if (!name) {
    return { error: "O nome da rotina é obrigatório." };
  }

  // Pegar o maior sort_order atual para colocar a nova no final
  const [maxOrder] = await db
    .select({ max: sql<number>`coalesce(max(${routines.sortOrder}), -1)` })
    .from(routines)
    .where(eq(routines.diaryId, params.diarioId));

  await db.insert(routines).values({
    diaryId: params.diarioId,
    name,
    icon,
    sortOrder: (maxOrder?.max ?? -1) + 1,
  });

  throw redirect(`/diarios/${params.diarioId}`);
}

export default function NovaRotina() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { diarioId } = useParams();

  return (
    <div className="max-w-md mx-auto">
      <Link
        to={`/diarios/${diarioId}`}
        className="text-sm text-gray-500 hover:text-violet-600 transition-colors mb-4 inline-block"
      >
        ← Voltar
      </Link>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Nova Rotina</h2>

      <Form
        method="post"
        className="bg-white rounded-2xl shadow-lg p-6 space-y-5"
      >
        {actionData?.error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
            {actionData.error}
          </div>
        )}

        <div>
          <label
            htmlFor="icon"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ícone (emoji)
          </label>
          <input
            id="icon"
            name="icon"
            type="text"
            defaultValue="📋"
            className="w-20 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-2xl text-center"
          />
        </div>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nome
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            placeholder="Ex: Manhã, Tarde, Noite..."
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {isSubmitting ? "Criando..." : "Criar Rotina"}
        </button>
      </Form>
    </div>
  );
}
