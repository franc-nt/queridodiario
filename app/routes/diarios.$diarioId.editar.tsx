import {
  redirect,
  Form,
  Link,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import { useState } from "react";
import type { Route } from "./+types/diarios.$diarioId.editar";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries } from "../db/schema";
import { eq, and } from "drizzle-orm";

export function meta() {
  return [{ title: "Editar Diário - Querido Diário" }];
}

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

export async function action({ request, context, params }: Route.ActionArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Verificar que o diário pertence ao tenant
  const [diary] = await db
    .select({ id: diaries.id })
    .from(diaries)
    .where(and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId)));

  if (!diary) {
    throw new Response("Diário não encontrado", { status: 404 });
  }

  if (intent === "delete") {
    await db
      .delete(diaries)
      .where(
        and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId))
      );
    throw redirect("/diarios");
  }

  if (intent === "regenerate-token") {
    const newToken = crypto.randomUUID();
    await db
      .update(diaries)
      .set({ accessToken: newToken })
      .where(
        and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId))
      );
    throw redirect(`/diarios/${params.diarioId}/editar`);
  }

  // Update
  const name = String(formData.get("name") ?? "").trim();
  const avatar = String(formData.get("avatar") ?? "").trim() || "📒";

  if (!name) {
    return { error: "O nome do diário é obrigatório." };
  }

  await db
    .update(diaries)
    .set({ name, avatar })
    .where(
      and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId))
    );

  return { success: true };
}

export default function EditarDiario() {
  const { diary } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const panelUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/painel#token=${diary.accessToken}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(panelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: selecionar o texto
      const input = document.getElementById(
        "panel-link"
      ) as HTMLInputElement | null;
      if (input) {
        input.select();
      }
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Editar Diário</h2>

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
            Diário atualizado com sucesso!
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
            defaultValue={diary.avatar || "📒"}
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
            defaultValue={diary.name}
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

      {/* Link do painel */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Link do Painel
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Compartilhe este link para acessar o painel de marcação de atividades
          sem login.
        </p>
        <div className="flex gap-2">
          <input
            id="panel-link"
            type="text"
            readOnly
            value={panelUrl}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 bg-gray-50 truncate"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 font-medium rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        <Form method="post" className="mt-3">
          <button
            type="submit"
            name="intent"
            value="regenerate-token"
            className="text-xs text-gray-400 hover:text-orange-600 transition-colors cursor-pointer"
          >
            Regenerar token de acesso
          </button>
        </Form>
      </div>

      {/* Zona de perigo */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-100">
        <h3 className="text-sm font-semibold text-red-600 mb-2">
          Zona de Perigo
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Ao deletar o diário, todas as rotinas, atividades e registros serão
          removidos permanentemente.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 font-medium rounded-xl text-sm transition-colors cursor-pointer"
          >
            Deletar Diário
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
