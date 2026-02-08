import { redirect, Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/diarios.novo";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries, routines } from "../db/schema";

export function meta() {
  return [{ title: "Novo Diário - Querido Diário" }];
}

export async function action({ request, context }: Route.ActionArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const avatar = String(formData.get("avatar") ?? "").trim() || "📒";

  if (!name) {
    return { error: "O nome do diário é obrigatório." };
  }

  const accessToken = crypto.randomUUID();

  const [diary] = await db
    .insert(diaries)
    .values({
      tenantId: userId,
      name,
      avatar,
      accessToken,
    })
    .returning();

  // Criar 3 rotinas padrão
  await db.insert(routines).values([
    { diaryId: diary.id, name: "Manhã", icon: "☀️", sortOrder: 0 },
    { diaryId: diary.id, name: "Tarde", icon: "🌤️", sortOrder: 1 },
    { diaryId: diary.id, name: "Noite", icon: "🌙", sortOrder: 2 },
  ]);

  throw redirect(`/diarios/${diary.id}`);
}

export default function NovoDiario() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-md mx-auto">
      <Link
        to="/diarios"
        className="text-sm text-gray-500 hover:text-violet-600 transition-colors mb-4 inline-block"
      >
        ← Voltar
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Novo Diário</h1>

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
            htmlFor="avatar"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Emoji
          </label>
          <input
            id="avatar"
            name="avatar"
            type="text"
            defaultValue="📒"
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
            placeholder="Ex: Maria, João..."
          />
        </div>

        <div className="bg-violet-50 rounded-lg px-4 py-3 text-sm text-violet-700">
          3 rotinas padrão serão criadas automaticamente: Manhã, Tarde e Noite.
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {isSubmitting ? "Criando..." : "Criar Diário"}
        </button>
      </Form>
    </div>
  );
}
