import { eq, and } from "drizzle-orm";
import { createDb } from "../db/client";
import { diaries, dayNotes } from "../db/schema";
import type { Route } from "./+types/api.painel.notes";

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
  const { date, content } = body as { date: string; content: string };

  if (!date) {
    return Response.json({ error: "Data ausente" }, { status: 400 });
  }

  // Delete existing note for this diary+date
  await db
    .delete(dayNotes)
    .where(
      and(eq(dayNotes.diaryId, diary.id), eq(dayNotes.date, date))
    );

  // If content is empty, just delete (no need to save empty note)
  if (!content || content.trim() === "") {
    return Response.json({ note: null });
  }

  // Insert new note
  const [note] = await db
    .insert(dayNotes)
    .values({
      diaryId: diary.id,
      date,
      content: content.trim(),
    })
    .returning();

  return Response.json({ note });
}
