import {
  redirect,
  Form,
  Link,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import { useState } from "react";
import type { Route } from "./+types/diarios.$diarioId.rotinas.$rotinaId.atividades.$atividadeId.editar";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import {
  diaries,
  routines,
  activities,
  activityDays,
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

const DAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export function meta() {
  return [{ title: "Editar Atividade - Querido Diário" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  // Verify diary ownership
  const [diary] = await db
    .select({ id: diaries.id })
    .from(diaries)
    .where(and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId)));

  if (!diary) {
    throw new Response("Diário não encontrado", { status: 404 });
  }

  // Verify routine
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

  // Fetch activity
  const [activity] = await db
    .select({
      id: activities.id,
      title: activities.title,
      icon: activities.icon,
      points: activities.points,
      type: activities.type,
      scheduledTime: activities.scheduledTime,
    })
    .from(activities)
    .where(
      and(
        eq(activities.id, params.atividadeId),
        eq(activities.routineId, params.rotinaId)
      )
    );

  if (!activity) {
    throw new Response("Atividade não encontrada", { status: 404 });
  }

  // Fetch assigned days
  const assignedDays = await db
    .select({ dayOfWeek: activityDays.dayOfWeek })
    .from(activityDays)
    .where(eq(activityDays.activityId, params.atividadeId));

  return {
    activity,
    assignedDays: assignedDays.map((d) => d.dayOfWeek),
    diarioId: params.diarioId,
    rotinaId: params.rotinaId,
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  // Verify ownership
  const [diary] = await db
    .select({ id: diaries.id })
    .from(diaries)
    .where(and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId)));

  if (!diary) {
    throw new Response("Diário não encontrado", { status: 404 });
  }

  // Verify activity belongs to routine
  const [activity] = await db
    .select({ id: activities.id })
    .from(activities)
    .where(
      and(
        eq(activities.id, params.atividadeId),
        eq(activities.routineId, params.rotinaId)
      )
    );

  if (!activity) {
    throw new Response("Atividade não encontrada", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    await db
      .delete(activities)
      .where(eq(activities.id, params.atividadeId));
    throw redirect(
      `/diarios/${params.diarioId}/rotinas/${params.rotinaId}`
    );
  }

  // Update
  const title = String(formData.get("title") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || "📌";
  const points = Math.max(1, Number(formData.get("points")) || 1);
  const type = String(formData.get("type")) as "binary" | "incremental";
  const scheduledTime =
    String(formData.get("scheduledTime") ?? "").trim() || null;
  const selectedDays = formData.getAll("days").map(Number);

  if (!title) {
    return { error: "O título é obrigatório." };
  }
  if (selectedDays.length === 0) {
    return { error: "Selecione pelo menos um dia." };
  }
  if (!["binary", "incremental"].includes(type)) {
    return { error: "Tipo inválido." };
  }

  // Update activity
  await db
    .update(activities)
    .set({ title, icon, points, type, scheduledTime })
    .where(eq(activities.id, params.atividadeId));

  // Delete old activity_days and insert new ones
  await db
    .delete(activityDays)
    .where(eq(activityDays.activityId, params.atividadeId));

  for (const day of selectedDays) {
    const [maxOrder] = await db
      .select({
        max: sql<number>`coalesce(max(${activityDays.sortOrder}), -1)`,
      })
      .from(activityDays)
      .innerJoin(activities, eq(activityDays.activityId, activities.id))
      .where(
        and(
          eq(activities.routineId, params.rotinaId),
          eq(activityDays.dayOfWeek, day)
        )
      );

    await db.insert(activityDays).values({
      activityId: params.atividadeId,
      dayOfWeek: day,
      sortOrder: (maxOrder?.max ?? -1) + 1,
    });
  }

  return { success: true };
}

export default function EditarAtividade() {
  const { activity, assignedDays, diarioId, rotinaId } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="max-w-md mx-auto">
      <Link
        to={`/diarios/${diarioId}/rotinas/${rotinaId}`}
        className="text-sm text-gray-500 hover:text-violet-600 transition-colors mb-4 inline-block"
      >
        ← Voltar
      </Link>

      <h2 className="text-xl font-bold text-gray-900 mb-6">
        Editar Atividade
      </h2>

      {/* Edit form */}
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
            Atividade atualizada com sucesso!
          </div>
        )}

        <div className="flex gap-4">
          <div>
            <label
              htmlFor="icon"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Ícone
            </label>
            <input
              id="icon"
              name="icon"
              type="text"
              defaultValue={activity.icon || "📌"}
              className="w-20 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-2xl text-center"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Título
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={activity.title}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label
              htmlFor="points"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Pontos
            </label>
            <input
              id="points"
              name="points"
              type="number"
              min="1"
              defaultValue={activity.points}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tipo
            </label>
            <select
              id="type"
              name="type"
              defaultValue={activity.type}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="binary">Fiz / Não Fiz</option>
              <option value="incremental">Incremental (+ / -)</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="scheduledTime"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Horário (opcional)
          </label>
          <input
            id="scheduledTime"
            name="scheduledTime"
            type="time"
            defaultValue={activity.scheduledTime || ""}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dias da semana
          </label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-violet-50 cursor-pointer has-[:checked]:bg-violet-100 has-[:checked]:border-violet-300 transition-colors"
              >
                <input
                  type="checkbox"
                  name="days"
                  value={day.value}
                  defaultChecked={assignedDays.includes(day.value)}
                  className="accent-violet-600"
                />
                <span className="text-sm text-gray-700">{day.label}</span>
              </label>
            ))}
          </div>
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

      {/* Danger zone */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-red-100">
        <h3 className="text-sm font-semibold text-red-600 mb-2">
          Zona de Perigo
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Ao deletar a atividade, todos os registros de completação associados
          serão removidos permanentemente.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 font-medium rounded-xl text-sm transition-colors cursor-pointer"
          >
            Deletar Atividade
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
