import { Outlet, Form, Link } from "react-router";
import type { Route } from "./+types/diarios";
import { requireAuth } from "../lib/require-auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  await requireAuth(request, context.cloudflare.env.SESSION_SECRET);
  return null;
}

export default function DiariosLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-violet-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/diarios"
            className="text-lg font-bold text-gray-900 hover:text-violet-700 transition-colors"
          >
            📒 Querido Diário
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
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
