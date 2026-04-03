import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { userStorageApiFields } from "@/lib/storage/storageApiSerialize";

const prisma = getOrCreatePrismaClient();

export async function GET(request: Request): Promise<Response> {
  const authUser = await resolveAuthUser(request);
  if (authUser === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      plan: true,
      storageUsed: true,
      role: true,
    },
  });

  if (row === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return HttpNextResponse.json(
    userStorageApiFields({
      plan: row.plan,
      storageUsed: row.storageUsed,
      role: row.role ?? "user",
    }),
  );
}
