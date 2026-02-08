import { createCookieSessionStorage } from "react-router";

export function createSessionStorage(secret: string) {
  return createCookieSessionStorage({
    cookie: {
      name: "__qd_session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
      sameSite: "lax",
      secrets: [secret],
      secure: true,
    },
  });
}

export type SessionStorage = ReturnType<typeof createSessionStorage>;
