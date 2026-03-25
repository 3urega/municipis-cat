import { Service } from "diod";

import { PrismaService } from "@/contexts/shared/infrastructure/prisma/PrismaService";

import type { MunicipalityPrimitives } from "../domain/MunicipalityPrimitives";
import { MunicipalityRepository } from "../domain/MunicipalityRepository";

@Service()
export class PrismaMunicipalityRepository extends MunicipalityRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async searchAll(userId: string): Promise<MunicipalityPrimitives[]> {
    const rows = await this.prisma.client.municipality.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            visits: { where: { userId } },
          },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      visitCount: r._count.visits,
    }));
  }
}
