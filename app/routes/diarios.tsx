import { Outlet, Form, Link, useLoaderData } from "react-router";
import type { Route } from "./+types/diarios";
import { requireAuth } from "../lib/require-auth.server";
import { createDb } from "../db/client";

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  const user = await requireAuth(
    request,
    context.cloudflare.env.SESSION_SECRET,
    db
  );
  return { isAdmin: user.isAdmin };
}

export default function DiariosLayout() {
  const { isAdmin } = useLoaderData<typeof loader>();
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-violet-100 sticky top-0 z-10">
        <div className="px-6 h-14 flex items-center justify-between">
          <Link
            to="/diarios"
            className="text-lg font-bold text-gray-900 hover:text-violet-700 transition-colors"
          >
            📒 Querido Diário
          </Link>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium text-violet-700 hover:text-violet-900 transition-colors"
              >
                Admin
              </Link>
            )}
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
