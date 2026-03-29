import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";

const prisma = getOrCreatePrismaClient();

export async function GET(request: Request): Promise<Response> {
  const authUser = await resolveAuthUser(request);
  if (authUser === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
    },
  });

  if (row === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return HttpNextResponse.json({
    user: {
      id: row.id,
      email: row.email ?? authUser.email,
      name: row.name,
      image: row.image,
      role: row.role ?? "user",
    },
  });
}
