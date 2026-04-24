import {
  Form,
  Link,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import { hashSync } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import type { Route } from "./+types/admin.usuarios.$userId.senha";
import { requireAdmin } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { tenants } from "../db/schema";

export function meta() {
  return [{ title: "Trocar Senha - Administração" }];
}

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  await requireAdmin(request, context.cloudflare.env.SESSION_SECRET, db);

  const user = await db.query.tenants.findFirst({
    where: eq(tenants.id, params.userId),
  });

  if (!user) {
    throw new Response("Usuário não encontrado", { status: 404 });
  }

  return { user: { id: user.id, name: user.name, email: user.email } };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  await requireAdmin(request, context.cloudflare.env.SESSION_SECRET, db);

  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!password || password.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }
  if (password !== confirm) {
    return { error: "As senhas não conferem." };
  }

  const user = await db.query.tenants.findFirst({
    where: eq(tenants.id, params.userId),
  });
  if (!user) {
    throw new Response("Usuário não encontrado", { status: 404 });
  }

  await db
    .update(tenants)
    .set({ passwordHash: hashSync(password, 10) })
    .where(eq(tenants.id, params.userId));

  return { success: "Senha alterada com sucesso. Informe o usuário." };
}

export default function TrocarSenha() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link
          to="/admin"
          className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
        >
          ← Usuários
        </Link>
        <span className="text-gray-300">/</span>
        <Link
          to={`/admin/usuarios/${user.id}/editar`}
          className="text-sm text-gray-500 hover:text-violet-600 transition-colors"
        >
          {user.name}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-lg font-semibold text-gray-900">
          Trocar senha
        </span>
      </div>

      {actionData && "error" in actionData && actionData.error && (
        <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
          {actionData.error}
        </div>
      )}
      {actionData && "success" in actionData && actionData.success && (
        <div className="mb-4 bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
          {actionData.success}
        </div>
      )}

      <Form
        method="post"
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
      >
        <p className="text-sm text-gray-600">
          Alterar senha de <strong>{user.email}</strong>
        </p>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nova senha
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres.</p>
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirmar nova senha
          </label>
          <input
            id="confirm"
            name="confirm"
            type="text"
            required
            minLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to={`/admin/usuarios/${user.id}/editar`}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            {isSubmitting ? "Salvando..." : "Salvar senha"}
          </button>
        </div>
      </Form>
    </div>
  );
}
