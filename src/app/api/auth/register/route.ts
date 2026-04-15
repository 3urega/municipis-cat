import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { isRegistrationAllowed } from "@/lib/auth/credentialsLoginAllowed";
import {
  normalizeRegisterEmail,
  validateRegisterInput,
} from "@/lib/auth/registerValidation";

const prisma = getOrCreatePrismaClient();

const BCRYPT_ROUNDS = 10;

function readRegisterBody(body: unknown): {
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
    email: normalizeRegisterEmail(emailRaw),
    password: passwordRaw,
  };
}

export async function POST(request: Request): Promise<Response> {
  if (!isRegistrationAllowed()) {
    return NextResponse.json(
      { error: "El registre no està habilitat en aquest servidor" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cos JSON invàlid" },
      { status: 400 },
    );
  }

  const parsed = readRegisterBody(body);
  if (parsed === null) {
    return NextResponse.json(
      { error: "Cal «email» i «password» (strings)" },
      { status: 400 },
    );
  }

  const valid = validateRegisterInput(parsed.email, parsed.password);
  if (!valid.ok) {
    return NextResponse.json({ error: valid.error }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.password, BCRYPT_ROUNDS);

  try {
    await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash,
        role: "user",
      },
    });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: unknown }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Aquest correu ja està registrat" },
        { status: 409 },
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
