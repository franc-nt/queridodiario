import { eq, and, sql } from "drizzle-orm";
import { createDb } from "../db/client";
import {
  diaries,
  routines,
  activities,
  activityDays,
  completions,
  dayNotes,
  extraActivities,
} from "../db/schema";
import type { Route } from "./+types/api.painel";

export async function loader({ request, context }: Route.LoaderArgs) {
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

  // Get date param or determine the best date
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");

  let targetDate: string;

  if (dateParam) {
    targetDate = dateParam;
  } else {
    // Find the last completion date, or use today
    const lastCompletion = await db
      .select({ maxDate: sql<string>`MAX(${completions.date})` })
      .from(completions)
      .where(eq(completions.diaryId, diary.id));

    const lastDate = lastCompletion[0]?.maxDate;
    targetDate = lastDate || new Date().toISOString().split("T")[0];
  }

  // Get day of week for the target date (0=Sun, 1=Mon, ..., 6=Sat)
  const targetDateObj = new Date(targetDate + "T12:00:00Z");
  const dayOfWeek = targetDateObj.getUTCDay();

  // Get all routines for this diary, ordered by sort_order
  const diaryRoutines = await db.query.routines.findMany({
    where: eq(routines.diaryId, diary.id),
    orderBy: routines.sortOrder,
    with: {
      activities: {
        with: {
          days: true,
          completions: true,
        },
      },
    },
  });

  // Build response: filter activities for this day of week and include completions for the date
  const routinesData = diaryRoutines.map((routine) => {
    const dayActivities = routine.activities
      .filter((activity) =>
        activity.days.some((d) => d.dayOfWeek === dayOfWeek)
      )
      .map((activity) => {
        const dayInfo = activity.days.find((d) => d.dayOfWeek === dayOfWeek);
        const dayCompletions = activity.completions.filter(
          (c) => c.date === targetDate && c.diaryId === diary.id
        );

        return {
          id: activity.id,
          title: activity.title,
          icon: activity.icon,
          points: activity.points,
          type: activity.type,
          scheduledTime: activity.scheduledTime,
          sortOrder: dayInfo?.sortOrder ?? 0,
          isExtra: false as boolean,
          completions: dayCompletions.map((c) => ({
            id: c.id,
            value: c.value,
            comment: c.comment,
            createdAt: c.createdAt,
          })),
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      id: routine.id,
      name: routine.name,
      icon: routine.icon,
      sortOrder: routine.sortOrder,
      activities: dayActivities,
    };
  });

  // Fetch extra activities for this date
  const extras = await db.query.extraActivities.findMany({
    where: and(
      eq(extraActivities.diaryId, diary.id),
      eq(extraActivities.date, targetDate),
    ),
  });

  // Append extra activities to their respective routines
  for (const extra of extras) {
    const routine = routinesData.find((r) => r.id === extra.routineId);
    if (routine) {
      routine.activities.push({
        id: extra.id,
        title: extra.title,
        icon: extra.icon ?? "📌",
        points: extra.points,
        type: "binary" as const,
        scheduledTime: null,
        sortOrder: 99999,
        isExtra: true,
        completions:
          extra.completionValue !== null
            ? [
                {
                  id: extra.id,
                  value: extra.completionValue,
                  comment: null,
                  createdAt: extra.createdAt,
                },
              ]
            : [],
      });
    }
  }

  // Calculate total points for the day
  const totalPoints = routinesData.reduce((total, routine) => {
    return (
      total +
      routine.activities.reduce((rTotal, activity) => {
        return (
          rTotal +
          activity.completions.reduce((cTotal, c) => cTotal + c.value, 0)
        );
      }, 0)
    );
  }, 0);

  // Fetch day note
  const dayNote = await db.query.dayNotes.findFirst({
    where: and(eq(dayNotes.diaryId, diary.id), eq(dayNotes.date, targetDate)),
  });

  return Response.json({
    diary: {
      id: diary.id,
      name: diary.name,
      avatar: diary.avatar,
    },
    date: targetDate,
    dayOfWeek,
    routines: routinesData,
    totalPoints,
    note: dayNote?.content ?? "",
  });
}
