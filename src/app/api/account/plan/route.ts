import { UserPlan } from "@prisma/client";

import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { userStorageApiFields } from "@/lib/storage/storageApiSerialize";

const prisma = getOrCreatePrismaClient();

function isPlanUpgradeAllowed(role: string): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  if (process.env.ALLOW_PLAN_UPGRADE === "true") {
    return true;
  }
  return role === "superadmin";
}

function parsePlanBody(json: unknown): UserPlan | null {
  if (typeof json !== "object" || json === null) {
    return null;
  }
  const p = (json as Record<string, unknown>).plan;
  if (p === UserPlan.FREE || p === "FREE") {
    return UserPlan.FREE;
  }
  if (p === UserPlan.PREMIUM || p === "PREMIUM") {
    return UserPlan.PREMIUM;
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  const authUser = await resolveAuthUser(request);
  if (authUser === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPlanUpgradeAllowed(authUser.role)) {
    return HttpNextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return HttpNextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plan = parsePlanBody(json);
  if (plan === null) {
    return HttpNextResponse.json(
      { error: 'Body must include plan: "FREE" | "PREMIUM"' },
      { status: 400 },
    );
  }

  const row = await prisma.user.update({
    where: { id: authUser.id },
    data: { plan },
    select: {
      plan: true,
      storageUsed: true,
      role: true,
    },
  });

  return HttpNextResponse.json({
    ok: true,
    ...userStorageApiFields({
      plan: row.plan,
      storageUsed: row.storageUsed,
      role: row.role ?? "user",
    }),
  });
}
