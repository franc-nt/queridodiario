import { config } from "dotenv";
config({ path: ".dev.vars" });
config({ path: ".env" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hashSync } from "bcrypt-ts";
import {
  tenants,
  diaries,
  routines,
  activities,
  activityDays,
  completions,
} from "./schema";

const DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("NEON_DATABASE_URL ou DATABASE_URL nao encontrada no .dev.vars ou .env");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql);

// Dias da semana: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
const SEG_A_SEX = [1, 2, 3, 4, 5];
const SEG_QUA = [1, 3];
const TER_QUI = [2, 4];

type ActivityDef = {
  title: string;
  icon: string;
  type: "binary" | "incremental";
  scheduledTime?: string;
  days?: number[];
};

async function seedActivity(
  routineId: string,
  def: ActivityDef,
  sortOrder: number,
) {
  const [activity] = await db
    .insert(activities)
    .values({
      routineId,
      title: def.title,
      icon: def.icon,
      points: 10,
      type: def.type,
      scheduledTime: def.scheduledTime,
    })
    .returning();

  const days = def.days || SEG_A_SEX;
  await db.insert(activityDays).values(
    days.map((day) => ({
      activityId: activity.id,
      dayOfWeek: day,
      sortOrder,
    })),
  );

  return activity;
}

async function seed() {
  console.log("Limpando dados existentes...");
  await db.delete(completions);
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

  const accessToken = "eb9bc459-a603-4404-bbb9-459ef8f21b2b";

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

  // === Rotina Manhã ===
  console.log("Criando rotina Manhã...");
  const [manha] = await db
    .insert(routines)
    .values({ diaryId: diary.id, name: "Manhã", icon: "☀️", sortOrder: 0 })
    .returning();

  const manhaAtividades: ActivityDef[] = [
    { title: "Levantar", icon: "⏰", type: "binary", scheduledTime: "06:00" },
    { title: "Dar bom dia e abraço no Papai e Mamãe", icon: "👫", type: "binary" },
    { title: "Beber água", icon: "💧", type: "binary" },
    { title: "Vestir a roupa", icon: "👗", type: "binary" },
    { title: "Aplicar spray no nariz", icon: "👃", type: "binary" },
    { title: "Dar bom dia aos cachorros", icon: "🐶", type: "binary" },
    { title: "Organizar Itens", icon: "✅", type: "binary" },
    { title: "Tomar café da manhã", icon: "☕", type: "binary" },
    { title: "Escovar os dentes", icon: "🦷", type: "binary" },
    { title: "Arrumar o cabelo", icon: "🎀", type: "binary" },
    { title: "Sair de casa no horário", icon: "🚗", type: "binary", scheduledTime: "06:45" },
    { title: "Comportamento", icon: "⭐", type: "incremental" },
  ];

  for (let i = 0; i < manhaAtividades.length; i++) {
    await seedActivity(manha.id, manhaAtividades[i], i);
  }

  // === Rotina Tarde ===
  console.log("Criando rotina Tarde...");
  const [tarde] = await db
    .insert(routines)
    .values({ diaryId: diary.id, name: "Tarde", icon: "🌤️", sortOrder: 1 })
    .returning();

  const tardeAtividades: ActivityDef[] = [
    { title: "Fazer tarefa", icon: "📝", type: "binary", scheduledTime: "11:15" },
    { title: "Almoçar", icon: "🍽️", type: "binary" },
    { title: "Colocar prato na pia", icon: "🥣", type: "binary" },
    { title: "Limpar a sujeira", icon: "🧽", type: "binary" },
    { title: "Escovar os dentes", icon: "🦷", type: "binary" },
    { title: "Organizar as coisas", icon: "🧺", type: "binary" },
    { title: "Fazer leitura", icon: "📖", type: "binary" },
    { title: "Assistir TV", icon: "📺", type: "binary" },
    { title: "Lanchar", icon: "🥪", type: "binary" },
    { title: "Brincar", icon: "🧸", type: "binary" },
    { title: "Aula de Balé", icon: "🩰", type: "binary", scheduledTime: "16:30", days: TER_QUI },
    { title: "Aula de Inglês", icon: "📕", type: "binary", scheduledTime: "17:30", days: SEG_QUA },
    { title: "Comportamento", icon: "⭐", type: "incremental" },
  ];

  for (let i = 0; i < tardeAtividades.length; i++) {
    await seedActivity(tarde.id, tardeAtividades[i], i);
  }

  // === Rotina Noite ===
  console.log("Criando rotina Noite...");
  const [noite] = await db
    .insert(routines)
    .values({ diaryId: diary.id, name: "Noite", icon: "🌙", sortOrder: 2 })
    .returning();

  const noiteAtividades: ActivityDef[] = [
    { title: "Jantar", icon: "🍲", type: "binary" },
    { title: "Colocar o prato na pia", icon: "🥣", type: "binary" },
    { title: "Organizar as coisas", icon: "🧸", type: "binary" },
    { title: "Organizar a mochila", icon: "🎒", type: "binary" },
    { title: "Escolher brinquedo p/ escola", icon: "🎲", type: "binary" },
    { title: "Colocar ração para cachorros", icon: "🦴", type: "binary" },
    { title: "Organizar o espaço dos cachorros", icon: "🏠", type: "binary" },
    { title: "Tomar banho", icon: "🚿", type: "binary" },
    { title: "Escovar os dentes", icon: "🦷", type: "binary" },
    { title: "Aplicar spray no nariz", icon: "👃", type: "binary" },
    { title: "Dormir", icon: "😴", type: "binary", scheduledTime: "20:15" },
    { title: "Comportamento", icon: "⭐", type: "incremental" },
  ];

  for (let i = 0; i < noiteAtividades.length; i++) {
    await seedActivity(noite.id, noiteAtividades[i], i);
  }

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
