import { MediaType } from "@prisma/client";

import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { syncUserPlanFromGooglePlay } from "@/lib/billing/syncUserPlanFromGooglePlay";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import { userMunicipalityUsageApiFields } from "@/lib/storage/municipalityUsageApiSerialize";
import { userStorageApiFields } from "@/lib/storage/storageApiSerialize";
import { effectiveMaxStoredImages } from "@/lib/storage/userPlanLimits";
import {
  computeNextUnlockIn,
  utcDateKeyNow,
} from "@/lib/rewards/rewardMunicipalityAds";

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
      rewardAdsWatched: true,
      rewardUnlockBlocks: true,
      rewardAdsDailyUtcDate: true,
      rewardAdsDailyCount: true,
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

  const muniRows = await prisma.visit.groupBy({
    by: ["municipalityId"],
    where: { userId: row.id },
  });
  const municipalityCatalogCount = await prisma.municipality.count();
  const municipalityUsage = userMunicipalityUsageApiFields({
    plan: row.plan,
    role: row.role ?? "user",
    distinctMunicipalitiesCount: muniRows.length,
    rewardUnlockBlocks: row.rewardUnlockBlocks,
    municipalityCatalogCount,
  });

  const todayUtc = utcDateKeyNow();
  const rewardAdsDailyCountToday =
    row.rewardAdsDailyUtcDate === todayUtc ? row.rewardAdsDailyCount : 0;

  const imagesUsedCount = await prisma.media.count({
    where: {
      type: MediaType.image,
      visit: { userId: row.id },
    },
  });
  const imagesLimit = effectiveMaxStoredImages(row.plan, row.role ?? "user");

  return HttpNextResponse.json({
    user: {
      id: row.id,
      email: row.email ?? authUser.email,
      name: row.name,
      image: row.image,
      role: row.role ?? "user",
      ...storage,
      ...municipalityUsage,
      rewardAdsWatched: row.rewardAdsWatched,
      rewardNextUnlockIn: computeNextUnlockIn(row.rewardAdsWatched),
      rewardAdsDailyCount: rewardAdsDailyCountToday,
      imagesUsedCount,
      imagesLimit,
    },
  });
}
