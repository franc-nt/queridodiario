import {
  redirect,
  Form,
  Link,
  useActionData,
  useNavigation,
} from "react-router";
import { hashSync } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/admin.usuarios.novo";
import { requireAdmin } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { tenants } from "../db/schema";

export function meta() {
  return [{ title: "Novo Usuário - Administração" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  await requireAdmin(request, context.cloudflare.env.SESSION_SECRET, db);
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  await requireAdmin(request, context.cloudflare.env.SESSION_SECRET, db);

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const plan = String(formData.get("plan") ?? "free").trim() || "free";
  const isAdmin = formData.get("isAdmin") === "on";

  if (!name || !email || !password) {
    return { error: "Nome, e-mail e senha são obrigatórios." };
  }
  if (password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.email, email),
  });
  if (existing) {
    return { error: "Já existe um usuário com este e-mail." };
  }

  await db.insert(tenants).values({
    name,
    email,
    passwordHash: hashSync(password, 10),
    plan,
    isAdmin,
  });

  throw redirect("/admin");
}

export default function NovoUsuario() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
        >
          ← Usuários
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-lg font-semibold text-gray-900">
          Novo usuário
        </span>
      </div>

      <Form
        method="post"
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
      >
        {actionData?.error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
            {actionData.error}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nome
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Senha inicial
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Mínimo 6 caracteres. Informe ao usuário por um canal seguro.
          </p>
        </div>

        <div>
          <label
            htmlFor="plan"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Plano
          </label>
          <input
            id="plan"
            name="plan"
            type="text"
            defaultValue="free"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isAdmin"
            name="isAdmin"
            type="checkbox"
            className="w-4 h-4 accent-violet-600"
          />
          <label htmlFor="isAdmin" className="text-sm text-gray-700">
            É administrador
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to="/admin"
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {isSubmitting ? "Criando..." : "Criar usuário"}
          </button>
        </div>
      </Form>
    </div>
  );
}
