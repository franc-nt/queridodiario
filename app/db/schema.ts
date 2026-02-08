import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  pgEnum,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

// Enum para tipo de atividade
export const activityTypeEnum = pgEnum("activity_type", [
  "binary",
  "incremental",
]);

// Tenants (usuarios admin)
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  plan: text("plan").default("free").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Diarios (perfis de rotina)
export const diaries = pgTable("diaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  accessToken: text("access_token").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Rotinas (Manha, Tarde, Noite)
export const routines = pgTable("routines", {
  id: uuid("id").defaultRandom().primaryKey(),
  diaryId: uuid("diary_id")
    .references(() => diaries.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Atividades
export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  routineId: uuid("routine_id")
    .references(() => routines.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  icon: text("icon"),
  points: integer("points").default(1).notNull(),
  type: activityTypeEnum("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Dias da atividade (em quais dias aparece + ordem por dia)
export const activityDays = pgTable(
  "activity_days",
  {
    activityId: uuid("activity_id")
      .references(() => activities.id, { onDelete: "cascade" })
      .notNull(),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Dom, 1=Seg, ..., 6=Sab
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.activityId, table.dayOfWeek] }),
  ],
);

// Completions (registros de marcacao)
export const completions = pgTable(
  "completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id")
      .references(() => activities.id, { onDelete: "cascade" })
      .notNull(),
    diaryId: uuid("diary_id")
      .references(() => diaries.id, { onDelete: "cascade" })
      .notNull(),
    date: date("date").notNull(),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("completions_activity_diary_date_idx").on(
      table.activityId,
      table.diaryId,
      table.date,
    ),
  ],
);
