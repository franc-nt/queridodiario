import {
  redirect,
  Form,
  Link,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import { and, eq, ne } from "drizzle-orm";
import type { Route } from "./+types/admin.usuarios.$userId.editar";
import { requireAdmin } from "../lib/require-auth.server";
import { createDb } from "../db/client";
import { tenants } from "../db/schema";

export function meta() {
  return [{ title: "Editar Usuário - Administração" }];
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

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      isAdmin: user.isAdmin,
      deletedAt: user.deletedAt,
    },
  };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const db = createDb(context.cloudflare.env.NEON_DATABASE_URL);
  const admin = await requireAdmin(
    request,
    context.cloudflare.env.SESSION_SECRET,
    db
  );

  const formData = await request.formData();
  const intent = formData.get("intent");

  const existing = await db.query.tenants.findFirst({
    where: eq(tenants.id, params.userId),
  });
  if (!existing) {
    throw new Response("Usuário não encontrado", { status: 404 });
  }

  if (intent === "delete") {
    if (admin.id === params.userId) {
      return { error: "Você não pode excluir sua própria conta." };
    }
    await db
      .update(tenants)
      .set({ deletedAt: new Date() })
      .where(eq(tenants.id, params.userId));
    throw redirect("/admin");
  }

  if (intent === "restore") {
    await db
      .update(tenants)
      .set({ deletedAt: null })
      .where(eq(tenants.id, params.userId));
    return { success: "Usuário restaurado." };
  }

  // intent === "update"
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "free").trim() || "free";
  const isAdmin = formData.get("isAdmin") === "on";

  if (!name || !email) {
    return { error: "Nome e e-mail são obrigatórios." };
  }

  // Checar conflito de e-mail (exceto o próprio usuário)
  const conflict = await db.query.tenants.findFirst({
    where: and(eq(tenants.email, email), ne(tenants.id, params.userId)),
  });
  if (conflict) {
    return { error: "Já existe outro usuário com este e-mail." };
  }

  // Impedir que o admin remova o próprio status de admin (evita lockout)
  const nextIsAdmin =
    admin.id === params.userId ? existing.isAdmin : isAdmin;

  await db
    .update(tenants)
    .set({ name, email, plan, isAdmin: nextIsAdmin })
    .where(eq(tenants.id, params.userId));

  return { success: "Usuário atualizado." };
}

export default function EditarUsuario() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const isDeleted = user.deletedAt !== null;

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
          Editar usuário
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

      {isDeleted && (
        <div className="mb-4 bg-amber-50 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>Este usuário está excluído (soft delete).</span>
          <Form method="post">
            <input type="hidden" name="intent" value="restore" />
            <button
              type="submit"
              className="text-amber-900 font-medium hover:underline"
            >
              Restaurar
            </button>
          </Form>
        </div>
      )}

      <Form
        method="post"
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
      >
        <input type="hidden" name="intent" value="update" />

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
            defaultValue={user.name}
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
            defaultValue={user.email}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
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
            defaultValue={user.plan}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isAdmin"
            name="isAdmin"
            type="checkbox"
            defaultChecked={user.isAdmin}
            className="w-4 h-4 accent-violet-600"
          />
          <label htmlFor="isAdmin" className="text-sm text-gray-700">
            É administrador
          </label>
        </div>

        <div className="flex justify-between items-center pt-2">
          <Link
            to={`/admin/usuarios/${user.id}/senha`}
            className="text-sm text-violet-600 hover:text-violet-800 font-medium"
          >
            Trocar senha →
          </Link>
          <div className="flex gap-3">
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
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </Form>

      {!isDeleted && (
        <Form
          method="post"
          className="mt-6"
          onSubmit={(e) => {
            if (
              !confirm(
                "Excluir este usuário? Ele não poderá mais fazer login. Os diários serão preservados e poderão ser restaurados depois."
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <button
            type="submit"
            className="w-full py-2.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl text-sm font-medium transition-colors"
          >
            Excluir usuário
          </button>
        </Form>
      )}
    </div>
  );
}
