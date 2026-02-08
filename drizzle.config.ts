import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Carrega .dev.vars (padrao do Wrangler) e .env como fallback
config({ path: ".dev.vars" });
config({ path: ".env" });

export default defineConfig({
  out: "./drizzle",
  schema: "./app/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.NEON_DATABASE_URL!,
  },
});
