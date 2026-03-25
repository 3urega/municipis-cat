import { Service } from "diod";

import { PrismaService } from "@/contexts/shared/infrastructure/prisma/PrismaService";

import type { MunicipalityPrimitives } from "../domain/MunicipalityPrimitives";
import { MunicipalityRepository } from "../domain/MunicipalityRepository";

@Service()
export class PrismaMunicipalityRepository extends MunicipalityRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async searchAll(): Promise<MunicipalityPrimitives[]> {
    const rows = await this.prisma.client.municipality.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return rows;
  }
}
