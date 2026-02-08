import { redirect, Form, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { createDb } from "../db/client";
import { createSessionStorage } from "../lib/sessions.server";
import { login, createUserSession, getUserId } from "../lib/auth.server";

export function meta() {
  return [{ title: "Login - Querido Diário" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const sessionStorage = createSessionStorage(
    context.cloudflare.env.SESSION_SECRET
  );
  const userId = await getUserId(request, sessionStorage);
  if (userId) throw redirect("/diarios");
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha email e senha." };
  }

  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  const user = await login(db, email, password);

  if (!user) {
    return { error: "Email ou senha incorretos." };
  }

  const sessionStorage = createSessionStorage(
    context.cloudflare.env.SESSION_SECRET
  );
  return createUserSession(sessionStorage, user.id, "/diarios");
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📒 Querido Diário</h1>
          <p className="text-gray-500 mt-2">Acesse sua conta</p>
        </div>

        <Form method="post" className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          {actionData?.error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {actionData.error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </Form>
      </div>
    </div>
  );
}
