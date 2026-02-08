import { config } from "dotenv";
config({ path: ".dev.vars" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hashSync } from "bcrypt-ts";
import { randomUUID } from "crypto";
import {
  tenants,
  diaries,
  routines,
  activities,
  activityDays,
} from "./schema";

const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("NEON_DATABASE_URL ou DATABASE_URL nao encontrada no .dev.vars ou .env");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Dias da semana: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];
const SEG_A_SEX = [1, 2, 3, 4, 5];

async function seed() {
  console.log("Limpando dados existentes...");
  await db.delete(activityDays);
  await db.delete(activities);
  await db.delete(routines);
  await db.delete(diaries);
  await db.delete(tenants);

  console.log("Criando tenant...");
  const [tenant] = await db
    .insert(tenants)
    .values({
      email: "francisconetoemail@gmail.com",
      passwordHash: hashSync("teste123", 10),
      name: "Francisco",
    })
    .returning();

  const accessToken = randomUUID();

  console.log("Criando diario Melina...");
  const [diary] = await db
    .insert(diaries)
    .values({
      tenantId: tenant.id,
      name: "Melina",
      avatar: "👧",
      accessToken,
    })
    .returning();

  // === Rotina Manha ===
  console.log("Criando rotina Manha...");
  const [manha] = await db
    .insert(routines)
    .values({
      diaryId: diary.id,
      name: "Manhã",
      icon: "☀️",
      sortOrder: 0,
    })
    .returning();

  const [beberAgua] = await db
    .insert(activities)
    .values({
      routineId: manha.id,
      title: "Beber água",
      icon: "💧",
      points: 10,
      type: "binary",
    })
    .returning();

  const [seArrumar] = await db
    .insert(activities)
    .values({
      routineId: manha.id,
      title: "Se arrumar",
      icon: "👗",
      points: 5,
      type: "binary",
    })
    .returning();

  const [obedeceuManha] = await db
    .insert(activities)
    .values({
      routineId: manha.id,
      title: "Obedeceu",
      icon: "⭐",
      points: 20,
      type: "incremental",
    })
    .returning();

  // Dias: Beber agua - todos os dias
  await db.insert(activityDays).values(
    TODOS_OS_DIAS.map((day, i) => ({
      activityId: beberAgua.id,
      dayOfWeek: day,
      sortOrder: 0,
    })),
  );

  // Dias: Se arrumar - Seg a Sex
  await db.insert(activityDays).values(
    SEG_A_SEX.map((day, i) => ({
      activityId: seArrumar.id,
      dayOfWeek: day,
      sortOrder: 1,
    })),
  );

  // Dias: Obedeceu - todos os dias
  await db.insert(activityDays).values(
    TODOS_OS_DIAS.map((day, i) => ({
      activityId: obedeceuManha.id,
      dayOfWeek: day,
      sortOrder: 2,
    })),
  );

  // === Rotina Tarde ===
  console.log("Criando rotina Tarde...");
  const [tarde] = await db
    .insert(routines)
    .values({
      diaryId: diary.id,
      name: "Tarde",
      icon: "🌤️",
      sortOrder: 1,
    })
    .returning();

  const [fazerTarefa] = await db
    .insert(activities)
    .values({
      routineId: tarde.id,
      title: "Fazer tarefa",
      icon: "📚",
      points: 15,
      type: "binary",
    })
    .returning();

  const [brincarEducativo] = await db
    .insert(activities)
    .values({
      routineId: tarde.id,
      title: "Brincar educativo",
      icon: "🧩",
      points: 10,
      type: "binary",
    })
    .returning();

  const [seComportou] = await db
    .insert(activities)
    .values({
      routineId: tarde.id,
      title: "Se comportou",
      icon: "🌟",
      points: 20,
      type: "incremental",
    })
    .returning();

  // Dias: Fazer tarefa - Seg a Sex
  await db.insert(activityDays).values(
    SEG_A_SEX.map((day, i) => ({
      activityId: fazerTarefa.id,
      dayOfWeek: day,
      sortOrder: 0,
    })),
  );

  // Dias: Brincar educativo - todos os dias
  await db.insert(activityDays).values(
    TODOS_OS_DIAS.map((day, i) => ({
      activityId: brincarEducativo.id,
      dayOfWeek: day,
      sortOrder: 1,
    })),
  );

  // Dias: Se comportou - todos os dias
  await db.insert(activityDays).values(
    TODOS_OS_DIAS.map((day, i) => ({
      activityId: seComportou.id,
      dayOfWeek: day,
      sortOrder: 2,
    })),
  );

  // === Rotina Noite ===
  console.log("Criando rotina Noite...");
  const [noite] = await db
    .insert(routines)
    .values({
      diaryId: diary.id,
      name: "Noite",
      icon: "🌙",
      sortOrder: 2,
    })
    .returning();

  const [escovarDentes] = await db
    .insert(activities)
    .values({
      routineId: noite.id,
      title: "Escovar os dentes",
      icon: "🪥",
      points: 10,
      type: "binary",
    })
    .returning();

  const [guardarBrinquedos] = await db
    .insert(activities)
    .values({
      routineId: noite.id,
      title: "Guardar brinquedos",
      icon: "🧸",
      points: 10,
      type: "binary",
    })
    .returning();

  const [dormirHorario] = await db
    .insert(activities)
    .values({
      routineId: noite.id,
      title: "Dormir no horário",
      icon: "😴",
      points: 15,
      type: "binary",
    })
    .returning();

  // Dias: Escovar os dentes - todos os dias
  await db.insert(activityDays).values(
    TODOS_OS_DIAS.map((day, i) => ({
      activityId: escovarDentes.id,
      dayOfWeek: day,
      sortOrder: 0,
    })),
  );

  // Dias: Guardar brinquedos - todos os dias
  await db.insert(activityDays).values(
    TODOS_OS_DIAS.map((day, i) => ({
      activityId: guardarBrinquedos.id,
      dayOfWeek: day,
      sortOrder: 1,
    })),
  );

  // Dias: Dormir no horario - todos os dias
  await db.insert(activityDays).values(
    TODOS_OS_DIAS.map((day, i) => ({
      activityId: dormirHorario.id,
      dayOfWeek: day,
      sortOrder: 2,
    })),
  );

  console.log("\n========================================");
  console.log("Seed concluido com sucesso!");
  console.log("========================================");
  console.log(`\nTenant: ${tenant.email}`);
  console.log(`Diario: ${diary.name} ${diary.avatar}`);
  console.log(`Access Token: ${accessToken}`);
  console.log(`\nLink do painel:`);
  console.log(`http://localhost:8787/painel#token=${accessToken}`);
  console.log("========================================\n");
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
