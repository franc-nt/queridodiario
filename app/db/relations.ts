import { relations } from "drizzle-orm";
import {
  tenants,
  diaries,
  routines,
  activities,
  activityDays,
  completions,
} from "./schema";

export const tenantsRelations = relations(tenants, ({ many }) => ({
  diaries: many(diaries),
}));

export const diariesRelations = relations(diaries, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [diaries.tenantId],
    references: [tenants.id],
  }),
  routines: many(routines),
  completions: many(completions),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  diary: one(diaries, {
    fields: [routines.diaryId],
    references: [diaries.id],
  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  routine: one(routines, {
    fields: [activities.routineId],
    references: [routines.id],
  }),
  days: many(activityDays),
  completions: many(completions),
}));

export const activityDaysRelations = relations(activityDays, ({ one }) => ({
  activity: one(activities, {
    fields: [activityDays.activityId],
    references: [activities.id],
  }),
}));

export const completionsRelations = relations(completions, ({ one }) => ({
  activity: one(activities, {
    fields: [completions.activityId],
    references: [activities.id],
  }),
  diary: one(diaries, {
    fields: [completions.diaryId],
    references: [diaries.id],
  }),
}));
