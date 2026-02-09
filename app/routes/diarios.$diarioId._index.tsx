import { Link, useLoaderData, Form, useNavigation } from "react-router";
import type { Route } from "./+types/diarios.$diarioId._index";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { routines, diaries } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";

export function meta() {
  return [{ title: "Rotinas - Querido Diário" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  const [diary] = await db
    .select({ id: diaries.id })
    .from(diaries)
    .where(and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId)));

  if (!diary) {
    throw new Response("Diário não encontrado", { status: 404 });
  }

  const diaryRoutines = await db
    .select({
      id: routines.id,
      name: routines.name,
      icon: routines.icon,
      sortOrder: routines.sortOrder,
    })
    .from(routines)
    .where(eq(routines.diaryId, params.diarioId))
    .orderBy(asc(routines.sortOrder));

  return { routines: diaryRoutines, diarioId: params.diarioId };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const userId = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET
  );
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  // Verificar ownership
  const [diary] = await db
    .select({ id: diaries.id })
    .from(diaries)
    .where(and(eq(diaries.id, params.diarioId), eq(diaries.tenantId, userId)));

  if (!diary) {
    throw new Response("Diário não encontrado", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "move-up" || intent === "move-down") {
    const routineId = String(formData.get("routineId"));

    // Buscar todas as rotinas ordenadas
    const allRoutines = await db
      .select({ id: routines.id, sortOrder: routines.sortOrder })
      .from(routines)
      .where(eq(routines.diaryId, params.diarioId))
      .orderBy(asc(routines.sortOrder));

    const currentIndex = allRoutines.findIndex((r) => r.id === routineId);
    if (currentIndex === -1) return null;

    const swapIndex =
      intent === "move-up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= allRoutines.length) return null;

    const current = allRoutines[currentIndex];
    const swap = allRoutines[swapIndex];

    // Trocar sort_order entre os dois
    await db
      .update(routines)
      .set({ sortOrder: swap.sortOrder })
      .where(eq(routines.id, current.id));

    await db
      .update(routines)
      .set({ sortOrder: current.sortOrder })
      .where(eq(routines.id, swap.id));
  }

  return null;
}

export default function DiarioIndex() {
  const { routines: routineList, diarioId } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isReordering = navigation.state === "submitting";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Rotinas</h2>
        <Link
          to={`/diarios/${diarioId}/rotinas/nova`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          + Nova Rotina
        </Link>
      </div>

      {routineList.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-gray-500 text-lg mb-4">
            Nenhuma rotina cadastrada.
          </p>
          <Link
            to={`/diarios/${diarioId}/rotinas/nova`}
            className="text-violet-600 hover:text-violet-700 font-medium"
          >
            Criar primeira rotina
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {routineList.map((routine, index) => (
            <div
              key={routine.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4"
            >
              {/* Setas de reordenação */}
              <div className="flex flex-col gap-1">
                <Form method="post">
                  <input type="hidden" name="intent" value="move-up" />
                  <input type="hidden" name="routineId" value={routine.id} />
                  <button
                    type="submit"
                    disabled={index === 0 || isReordering}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Mover para cima"
                  >
                    ▲
                  </button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="move-down" />
                  <input type="hidden" name="routineId" value={routine.id} />
                  <button
                    type="submit"
                    disabled={
                      index === routineList.length - 1 || isReordering
                    }
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Mover para baixo"
                  >
                    ▼
                  </button>
                </Form>
              </div>

              {/* Info da rotina — link para kanban */}
              <Link
                to={`/diarios/${diarioId}/rotinas/${routine.id}`}
                className="flex-1 min-w-0 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{routine.icon || "📋"}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
                      {routine.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Ordem: {routine.sortOrder + 1}
                    </p>
                  </div>
                </div>
              </Link>

              {/* Link para editar */}
              <Link
                to={`/diarios/${diarioId}/rotinas/${routine.id}/editar`}
                className="text-sm text-gray-400 hover:text-violet-600 transition-colors shrink-0"
              >
                Editar
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
