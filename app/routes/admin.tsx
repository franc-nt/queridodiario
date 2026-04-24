import { Outlet, Form, Link } from "react-router";
import type { Route } from "./+types/admin";
import { requireAdmin } from "../lib/require-auth.server";
import { createDb } from "../db/client";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  await requireAdmin(request, context.cloudflare.env.SESSION_SECRET, db);
  return null;
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-900">
              🛠️ Administração
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/diarios"
              className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
            >
              ← Voltar aos Diários
            </Link>
            <Form method="post" action="/logout">
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                Sair
              </button>
            </Form>
          </div>
        </div>
      </header>
      <main className="px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
