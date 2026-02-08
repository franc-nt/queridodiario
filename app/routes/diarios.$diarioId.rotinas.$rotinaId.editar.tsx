import {
  redirect,
  Form,
  Link,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import { useState } from "react";
import type { Route } from "./+types/diarios.$diarioId.rotinas.$rotinaId.editar";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries, routines } from "../db/schema";
import { eq, and } from "drizzle-orm";

export function meta() {
  return [{ title: "Editar Rotina - Querido Diário" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
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

  const [routine] = await db
    .select({
      id: routines.id,
      name: routines.name,
      icon: routines.icon,
      sortOrder: routines.sortOrder,
    })
    .from(routines)
    .where(
      and(
        eq(routines.id, params.rotinaId),
        eq(routines.diaryId, params.diarioId)
      )
    );

  if (!routine) {
    throw new Response("Rotina não encontrada", { status: 404 });
  }

  return { routine, diarioId: params.diarioId };
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

  // Verificar que a rotina pertence ao diário
  const [routine] = await db
    .select({ id: routines.id })
    .from(routines)
    .where(
      and(
        eq(routines.id, params.rotinaId),
        eq(routines.diaryId, params.diarioId)
      )
    );

  if (!routine) {
    throw new Response("Rotina não encontrada", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await db.delete(routines).where(eq(routines.id, params.rotinaId));
    throw redirect(`/diarios/${params.diarioId}`);
  }

  // Update
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || "📋";

  if (!name) {
    return { error: "O nome da rotina é obrigatório." };
  }

  await db
    .update(routines)
    .set({ name, icon })
    .where(eq(routines.id, params.rotinaId));

  return { success: true };
}

export default function EditarRotina() {
  const { routine, diarioId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="max-w-md mx-auto">
      <Link
        to={`/diarios/${diarioId}`}
        className="text-sm text-gray-500 hover:text-violet-600 transition-colors mb-4 inline-block"
      >
        ← Voltar
      </Link>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Editar Rotina</h2>

      {/* Formulário de edição */}
      <Form
        method="post"
        className="bg-white rounded-2xl shadow-lg p-6 space-y-5 mb-6"
      >
        {actionData?.error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
            {actionData.error}
          </div>
        )}
        {actionData?.success && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
            Rotina atualizada com sucesso!
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
            defaultValue={routine.icon || "📋"}
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
            defaultValue={routine.name}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          name="intent"
          value="update"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </Form>

      {/* Zona de perigo */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-100">
        <h3 className="text-sm font-semibold text-red-600 mb-2">
          Zona de Perigo
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Ao deletar a rotina, todas as atividades e registros de completação
          associados serão removidos permanentemente.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 font-medium rounded-xl text-sm transition-colors cursor-pointer"
          >
            Deletar Rotina
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-600 font-medium">
              Tem certeza? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Form method="post">
                <button
                  type="submit"
                  name="intent"
                  value="delete"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Sim, deletar
                </button>
              </Form>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium rounded-xl text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
