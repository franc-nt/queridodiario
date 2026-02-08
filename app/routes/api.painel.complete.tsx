import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client";
import { diaries, activities, completions } from "../db/schema";
import type { Route } from "./+types/api.painel.complete";

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const token = request.headers.get("X-Access-Token");
  if (!token) {
    return Response.json({ error: "Token ausente" }, { status: 401 });
  }

  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  // Validate token and get diary
  const diary = await db.query.diaries.findFirst({
    where: eq(diaries.accessToken, token),
  });

  if (!diary) {
    return Response.json({ error: "Token invalido" }, { status: 401 });
  }

  const body = await request.json();
  const { activityId, date, value } = body as {
    activityId: string;
    date: string;
    value: number;
  };

  if (!activityId || !date || value === undefined) {
    return Response.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // Verify the activity belongs to this diary
  const activity = await db.query.activities.findFirst({
    where: eq(activities.id, activityId),
    with: {
      routine: true,
    },
  });

  if (!activity || activity.routine.diaryId !== diary.id) {
    return Response.json({ error: "Atividade invalida" }, { status: 404 });
  }

  if (activity.type === "binary") {
    // Binary: only one completion per day. Delete existing and insert new.
    await db
      .delete(completions)
      .where(
        and(
          eq(completions.activityId, activityId),
          eq(completions.diaryId, diary.id),
          eq(completions.date, date)
        )
      );

    const [completion] = await db
      .insert(completions)
      .values({
        activityId,
        diaryId: diary.id,
        date,
        value,
      })
      .returning();

    return Response.json({ completion });
  } else {
    // Incremental: add a new completion each time
    const [completion] = await db
      .insert(completions)
      .values({
        activityId,
        diaryId: diary.id,
        date,
        value,
      })
      .returning();

    return Response.json({ completion });
  }
}
