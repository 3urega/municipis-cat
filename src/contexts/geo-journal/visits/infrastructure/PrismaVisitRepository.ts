import type { Media, Visit } from "@prisma/client";
import { Service } from "diod";

import { PrismaService } from "@/contexts/shared/infrastructure/prisma/PrismaService";

import type { CreateVisitInput } from "../domain/CreateVisitInput";
import type { VisitWithMediaPrimitives } from "../domain/VisitWithMediaPrimitives";
import { VisitRepository } from "../domain/VisitRepository";

type VisitWithRelations = Visit & { media: Media[] };

@Service()
export class PrismaVisitRepository extends VisitRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async existsMunicipalityById(id: string): Promise<boolean> {
    const row = await this.prisma.client.municipality.findUnique({
      where: { id },
      select: { id: true },
    });
    return row !== null;
  }

  async create(input: CreateVisitInput): Promise<VisitWithMediaPrimitives> {
    const visit = await this.prisma.client.$transaction(async (tx) => {
      return tx.visit.create({
        data: {
          userId: input.userId,
          municipalityId: input.municipalityId,
          visitedAt: input.visitedAt,
          notes: input.notes ?? null,
          media:
            input.media.length > 0
              ? {
                  create: input.media.map((m) => ({
                    type: m.type,
                    url: m.url,
                  })),
                }
              : undefined,
        },
        include: { media: true },
      });
    });

    return this.toVisitWithMedia(visit);
  }

  async searchByMunicipalityId(
    municipalityId: string,
    userId: string,
  ): Promise<VisitWithMediaPrimitives[]> {
    const visits = await this.prisma.client.visit.findMany({
      where: { municipalityId, userId },
      orderBy: { visitedAt: "desc" },
      include: { media: true },
    });

    return visits.map((v) => this.toVisitWithMedia(v));
  }

  private toVisitWithMedia(visit: VisitWithRelations): VisitWithMediaPrimitives {
    return {
      id: visit.id,
      municipalityId: visit.municipalityId,
      visitedAt: visit.visitedAt.toISOString(),
      notes: visit.notes,
      media: visit.media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
      })),
    };
  }
}
