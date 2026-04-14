import { resolveAuthUser } from "@/lib/auth/resolveAuthUser";
import { HttpNextResponse } from "@/contexts/shared/infrastructure/http/HttpNextResponse";
import { getOrCreatePrismaClient } from "@/contexts/shared/infrastructure/prisma/prismaSingleton";
import {
  computeBlocksFromAdsWatched,
  computeNextUnlockIn,
  computeTotalAllowedMunicipalities,
  MAX_REWARD_ADS_PER_UTC_DAY,
  utcDateKeyNow,
} from "@/lib/rewards/rewardMunicipalityAds";

const prisma = getOrCreatePrismaClient();

export async function POST(request: Request): Promise<Response> {
  const authUser = await resolveAuthUser(request);
  if (authUser === null) {
    return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = utcDateKeyNow();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.user.findUnique({
        where: { id: authUser.id },
        select: {
          rewardAdsWatched: true,
          rewardUnlockBlocks: true,
          rewardAdsDailyUtcDate: true,
          rewardAdsDailyCount: true,
        },
      });
      if (row === null) {
        return { kind: "not_found" as const };
      }

      let dailyCount = row.rewardAdsDailyCount;
      const storedDate = row.rewardAdsDailyUtcDate;
      if (storedDate !== today) {
        dailyCount = 0;
      }

      if (dailyCount >= MAX_REWARD_ADS_PER_UTC_DAY) {
        return { kind: "rate_limited" as const };
      }

      const adsWatched = row.rewardAdsWatched + 1;
      const blocks = computeBlocksFromAdsWatched(adsWatched);
      const nextUnlockBlocks =
        blocks > row.rewardUnlockBlocks ? blocks : row.rewardUnlockBlocks;

      const updated = await tx.user.update({
        where: { id: authUser.id },
        data: {
          rewardAdsWatched: adsWatched,
          rewardUnlockBlocks: nextUnlockBlocks,
          rewardAdsDailyUtcDate: today,
          rewardAdsDailyCount: dailyCount + 1,
        },
        select: {
          rewardAdsWatched: true,
          rewardUnlockBlocks: true,
        },
      });

      const catalogCount = await tx.municipality.count();
      const totalAllowed = computeTotalAllowedMunicipalities(
        updated.rewardUnlockBlocks,
        catalogCount,
      );

      return {
        kind: "ok" as const,
        adsWatched: updated.rewardAdsWatched,
        blocks: updated.rewardUnlockBlocks,
        totalAllowed,
        nextUnlockIn: computeNextUnlockIn(updated.rewardAdsWatched),
      };
    });

    if (result.kind === "not_found") {
      return HttpNextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (result.kind === "rate_limited") {
      return HttpNextResponse.json(
        {
          error: `Has arribat al límit de ${String(MAX_REWARD_ADS_PER_UTC_DAY)} anuncis recompensats per avui (UTC).`,
        },
        { status: 429 },
      );
    }

    if (result.kind !== "ok") {
      return HttpNextResponse.json(
        { error: "No s’ha pogut registrar la recompensa." },
        { status: 500 },
      );
    }

    console.info("[reward/admob]", {
      userId: authUser.id,
      adsWatched: result.adsWatched,
      blocks: result.blocks,
      at: new Date().toISOString(),
    });

    return HttpNextResponse.json({
      adsWatched: result.adsWatched,
      blocks: result.blocks,
      totalAllowed: result.totalAllowed,
      nextUnlockIn: result.nextUnlockIn,
    });
  } catch (e) {
    console.error("[reward/admob]", e);
    return HttpNextResponse.json(
      { error: "No s’ha pogut registrar la recompensa." },
      { status: 500 },
    );
  }
}
