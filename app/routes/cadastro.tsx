import {
  redirect,
  Form,
  Link,
  useActionData,
  useNavigation,
} from "react-router";
import { hashSync } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/cadastro";
import { createDb } from "../db/client";
import { tenants } from "../db/schema";
import { createSessionStorage } from "../lib/sessions.server";
import { getUserId } from "../lib/auth.server";

export function meta() {
  return [{ title: "Criar conta - Querido Diário" }];
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
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!name || !email || !password || !passwordConfirm) {
    return { error: "Preencha todos os campos." };
  }

  if (password !== passwordConfirm) {
    return { error: "As senhas não conferem." };
  }

  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);

  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.email, email),
  });

  if (existing) {
    return { error: "Este email já está cadastrado." };
  }

  await db.insert(tenants).values({
    name,
    email,
    passwordHash: hashSync(password, 10),
  });

  throw redirect("/login?cadastrado=1");
}

export default function CadastroPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📒 Querido Diário</h1>
          <p className="text-gray-500 mt-2">Crie sua conta</p>
        </div>

        <Form method="post" className="bg-white rounded-2xl shadow-lg p-6 space-y-5">
          {actionData?.error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {actionData.error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="Seu nome"
            />
          </div>

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
              autoComplete="new-password"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar senha
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
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
            {isSubmitting ? "Cadastrando..." : "Cadastrar"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-violet-600 hover:text-violet-700 font-medium">
              Entrar
            </Link>
          </p>
        </Form>
      </div>
    </div>
  );
}
