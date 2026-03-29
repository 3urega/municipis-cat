import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { DEV_SUPERADMIN_EMAIL } from "@/lib/devAuth";
import { isCredentialsLoginAllowed } from "@/lib/auth/credentialsLoginAllowed";
import {
  AUTH_TOKEN_COOKIE_NAME,
  signToken,
} from "@/lib/auth/jwt";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";

const TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const prisma = getOrCreatePrismaClient();

function readEmailPasswordFromBody(body: unknown): {
  email: string;
  password: string;
} | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const emailRaw = (body as { email?: unknown }).email;
  const passwordRaw = (body as { password?: unknown }).password;
  if (typeof emailRaw !== "string" || typeof passwordRaw !== "string") {
    return null;
  }
  return {
    email: emailRaw.trim().toLowerCase(),
    password: passwordRaw.trim(),
  };
}

export async function POST(request: Request): Promise<Response> {
  if (!isCredentialsLoginAllowed()) {
    return NextResponse.json(
      { error: "Credentials login is not enabled on this server" },
      { status: 403 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  let parsed: { email: string; password: string } | null = null;

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            "Cos del formulari invàlid. Alternativa: cos JSON amb Content-Type: application/json.",
        },
        { status: 400 },
      );
    }
    const emailVal = form.get("email");
    const passwordVal = form.get("password");
    parsed = readEmailPasswordFromBody({
      email: typeof emailVal === "string" ? emailVal : "",
      password: typeof passwordVal === "string" ? passwordVal : "",
    });
  } else {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Cos JSON invàlid o buit. A Postman/Insomnia: Body → raw → JSON, capçalera Content-Type: application/json, cos {\"email\":\"...\",\"password\":\"...\"}.",
        },
        { status: 400 },
      );
    }
    parsed = readEmailPasswordFromBody(body);
  }

  if (parsed === null) {
    return NextResponse.json(
      {
        error:
          "Cal «email» i «password» (strings). Exemple JSON: {\"email\":\"dev-superadmin@local.dev\",\"password\":\"…\"}.",
      },
      { status: 400 },
    );
  }

  const { email, password } = parsed;
  if (email !== DEV_SUPERADMIN_EMAIL) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: DEV_SUPERADMIN_EMAIL },
  });
  if (
    user === null ||
    user.passwordHash === null ||
    user.passwordHash.length === 0
  ) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  }

  const role = user.role ?? "user";
  const token = await signToken({
    sub: user.id,
    email: user.email ?? email,
    role,
  });

  const res = NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email ?? email,
      role,
      name: user.name,
      image: user.image,
    },
  });

  res.cookies.set(AUTH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_COOKIE_MAX_AGE_SECONDS,
  });

  return res;
}
