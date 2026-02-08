import { compare } from "bcrypt-ts";
import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { tenants } from "../db/schema";
import type { SessionStorage } from "./sessions.server";

export async function login(
  db: Database,
  email: string,
  password: string
): Promise<{ id: string; name: string; email: string } | null> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.email, email),
  });

  if (!tenant) return null;

  const valid = await compare(password, tenant.passwordHash);
  if (!valid) return null;

  return { id: tenant.id, name: tenant.name, email: tenant.email };
}

export async function getUserId(
  request: Request,
  sessionStorage: SessionStorage
): Promise<string | null> {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const userId = session.get("userId");
  return typeof userId === "string" ? userId : null;
}

export async function createUserSession(
  sessionStorage: SessionStorage,
  userId: string,
  redirectTo: string
): Promise<Response> {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function destroyUserSession(
  request: Request,
  sessionStorage: SessionStorage
): Promise<Response> {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
