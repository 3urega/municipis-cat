import { UserPlan } from "@prisma/client";
import { Service } from "diod";

import { FreePlanMunicipalityLimitExceededError } from "../../domain/FreePlanMunicipalityLimitExceededError";
import { VisitRepository } from "../../domain/VisitRepository";
import { PrismaService } from "@/contexts/shared/infrastructure/prisma/PrismaService";
import { computeTotalAllowedMunicipalities } from "@/lib/rewards/rewardMunicipalityAds";
import { FREE_PLAN_MUNICIPALITY_LIMIT_MESSAGE_CA } from "@/lib/storage/planLimitConstants";
import { isStorageUnlimitedRole } from "@/lib/storage/userPlanLimits";

@Service()
export class VisitMunicipalityLimitGuard {
  constructor(
    private readonly prisma: PrismaService,
    private readonly visits: VisitRepository,
  ) {}

  /**
   * Comensa abans de crear una visita nova: FREE només pot tenir N municipis
   * distints; es permeten més visites al mateix municipi.
   */
  async assertAllowsNewVisitToMunicipality(
    userId: string,
    municipalityId: string,
  ): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { plan: true, role: true, rewardUnlockBlocks: true },
    });
    if (user === null) {
      return;
    }
    if (isStorageUnlimitedRole(user.role)) {
      return;
    }
    if (user.plan !== UserPlan.FREE) {
      return;
    }
    const catalogCount = await this.prisma.client.municipality.count();
    const max = computeTotalAllowedMunicipalities(
      user.rewardUnlockBlocks,
      catalogCount,
    );
    const already = await this.visits.hasUserVisitInMunicipality(
      userId,
      municipalityId,
    );
    if (already) {
      return;
    }
    const distinct =
      await this.visits.countDistinctMunicipalitiesForUser(userId);
    if (distinct >= max) {
      throw new FreePlanMunicipalityLimitExceededError(
        FREE_PLAN_MUNICIPALITY_LIMIT_MESSAGE_CA,
      );
    }
  }
}
