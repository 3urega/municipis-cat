import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { syncUserPlanFromGooglePlay } from "@/lib/billing/syncUserPlanFromGooglePlay";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { userStorageApiFields } from "@/lib/storage/storageApiSerialize";

const prisma = getOrCreatePrismaClient();

export async function GET(request: Request): Promise<Response> {
  const authUser = await resolveAuthUser(request);
  if (authUser === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playCount = await prisma.googlePlaySubscription.count({
    where: { userId: authUser.id },
  });
  if (playCount > 0) {
    await syncUserPlanFromGooglePlay(prisma, authUser.id);
  }

  const row = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      plan: true,
      storageUsed: true,
    },
  });

  if (row === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storage = userStorageApiFields({
    plan: row.plan,
    storageUsed: row.storageUsed,
    role: row.role ?? "user",
  });

  return HttpNextResponse.json({
    user: {
      id: row.id,
      email: row.email ?? authUser.email,
      name: row.name,
      image: row.image,
      role: row.role ?? "user",
      ...storage,
    },
  });
}
