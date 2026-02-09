import { Link, useLoaderData } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/diarios.$diarioId.rotinas.$rotinaId";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { diaries, routines, activities, activityDays } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import KanbanBoard from "../components/KanbanBoard";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function meta() {
  return [{ title: "Atividades - Querido Diário" }];
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

  // Verify routine belongs to diary
  const [routine] = await db
    .select({
      id: routines.id,
      name: routines.name,
      icon: routines.icon,
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

  // Fetch all activities for this routine
  const allActivities = await db
    .select({
      id: activities.id,
      title: activities.title,
      icon: activities.icon,
      points: activities.points,
      type: activities.type,
      scheduledTime: activities.scheduledTime,
    })
    .from(activities)
    .where(eq(activities.routineId, params.rotinaId));

  // Fetch activity_days
  const activityIds = allActivities.map((a) => a.id);
  let allDays: {
    activityId: string;
    dayOfWeek: number;
    sortOrder: number;
  }[] = [];

  if (activityIds.length > 0) {
    allDays = await db
      .select({
        activityId: activityDays.activityId,
        dayOfWeek: activityDays.dayOfWeek,
        sortOrder: activityDays.sortOrder,
      })
      .from(activityDays)
      .where(inArray(activityDays.activityId, activityIds));
  }

  // Build columns grouped by day
  const columns: Record<
    number,
    {
      id: string;
      title: string;
      icon: string | null;
      points: number;
      type: "binary" | "incremental";
      scheduledTime: string | null;
    }[]
  > = {};

  for (const day of DAY_ORDER) {
    const dayEntries = allDays
      .filter((d) => d.dayOfWeek === day)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    columns[day] = dayEntries
      .map((de) => allActivities.find((a) => a.id === de.activityId)!)
      .filter(Boolean);
  }

  return {
    routine,
    columns,
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

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "reorder") {
    const dayOfWeek = Number(formData.get("dayOfWeek"));
    const activityIds: string[] = JSON.parse(
      String(formData.get("activityIds"))
    );

    for (let i = 0; i < activityIds.length; i++) {
      await db
        .update(activityDays)
        .set({ sortOrder: i })
        .where(
          and(
            eq(activityDays.activityId, activityIds[i]),
            eq(activityDays.dayOfWeek, dayOfWeek)
          )
        );
    }
  }

  return null;
}

export default function KanbanPage() {
  const { routine, columns, diarioId, rotinaId } =
    useLoaderData<typeof loader>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Link
            to={`/diarios/${diarioId}`}
            className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
          >
            ← Rotinas
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-lg font-semibold text-gray-900">
            {routine.icon || "📋"} {routine.name}
          </span>
        </div>
        <Link
          to={`/diarios/${diarioId}/rotinas/${rotinaId}/atividades/nova`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          + Nova Atividade
        </Link>
      </div>

      {mounted ? (
        <KanbanBoard
          columns={columns}
          diarioId={diarioId}
          rotinaId={rotinaId}
        />
      ) : (
        <div className="text-center py-12 text-gray-400">
          Carregando quadro...
        </div>
      )}
    </div>
  );
}
