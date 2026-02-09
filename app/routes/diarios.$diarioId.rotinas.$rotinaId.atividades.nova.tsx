import {
  redirect,
  Form,
  Link,
  useActionData,
  useNavigation,
  useParams,
} from "react-router";
import type { Route } from "./+types/diarios.$diarioId.rotinas.$rotinaId.atividades.nova";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries, routines, activities, activityDays } from "../db/schema";
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
  return [{ title: "Nova Atividade - Querido Diário" }];
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

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const icon = String(formData.get("icon") ?? "").trim() || "📌";
  const points = Math.max(0, Number(formData.get("points")) || 0);
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

  // Create activity
  const [newActivity] = await db
    .insert(activities)
    .values({
      routineId: params.rotinaId,
      title,
      icon,
      points,
      type,
      scheduledTime,
    })
    .returning({ id: activities.id });

  // Insert activity_days for each selected day
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
      activityId: newActivity.id,
      dayOfWeek: day,
      sortOrder: (maxOrder?.max ?? -1) + 1,
    });
  }

  throw redirect(
    `/diarios/${params.diarioId}/rotinas/${params.rotinaId}`
  );
}

export default function NovaAtividade() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { diarioId, rotinaId } = useParams();

  return (
    <div className="max-w-md mx-auto">
      <Link
        to={`/diarios/${diarioId}/rotinas/${rotinaId}`}
        className="text-sm text-gray-500 hover:text-violet-600 transition-colors mb-4 inline-block"
      >
        ← Voltar
      </Link>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Nova Atividade</h2>

      <Form
        method="post"
        className="bg-white rounded-2xl shadow-lg p-6 space-y-5"
      >
        {actionData?.error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
            {actionData.error}
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
              defaultValue="📌"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="Ex: Beber água"
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
              min="0"
              defaultValue="1"
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
              defaultValue="binary"
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
                  defaultChecked
                  className="accent-violet-600"
                />
                <span className="text-sm text-gray-700">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-colors cursor-pointer"
        >
          {isSubmitting ? "Criando..." : "Criar Atividade"}
        </button>
      </Form>
    </div>
  );
}
