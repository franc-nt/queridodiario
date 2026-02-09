import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client";
import { diaries, routines, extraActivities } from "../db/schema";
import type { Route } from "./+types/api.painel.extra-activity";

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const token = request.headers.get("X-Access-Token");
  if (!token) {
    return Response.json({ error: "Token ausente" }, { status: 401 });
  }

  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  const diary = await db.query.diaries.findFirst({
    where: eq(diaries.accessToken, token),
  });

  if (!diary) {
    return Response.json({ error: "Token invalido" }, { status: 401 });
  }

  const body = await request.json();
  const { routineId, date, title, points, icon } = body as {
    routineId: string;
    date: string;
    title: string;
    points: number;
    icon?: string;
  };

  if (!routineId || !date || !title) {
    return Response.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // Verify the routine belongs to this diary
  const routine = await db.query.routines.findFirst({
    where: and(eq(routines.id, routineId), eq(routines.diaryId, diary.id)),
  });

  if (!routine) {
    return Response.json({ error: "Rotina invalida" }, { status: 404 });
  }

  const [extra] = await db
    .insert(extraActivities)
    .values({
      diaryId: diary.id,
      routineId,
      date,
      title,
      points: points ?? 1,
      icon: icon || "📌",
    })
    .returning();

  return Response.json({ extraActivity: extra });
}
