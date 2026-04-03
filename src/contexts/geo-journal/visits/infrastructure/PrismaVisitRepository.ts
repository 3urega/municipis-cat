import type { Media, MediaType, Visit } from "@prisma/client";
import { Service } from "diod";

import { UserStorageQuotaService } from "@/contexts/shared/application/UserStorageQuotaService";
import { PrismaService } from "@/contexts/shared/infrastructure/prisma/PrismaService";
import {
  isLocalVisitUploadUrl,
  removeVisitUploadDirectory,
  statVisitUploadForUser,
  unlinkVisitUploadForUser,
} from "@/lib/uploads/visitUploadFs";

import type { CreateVisitInput } from "../domain/CreateVisitInput";
import type { UpdateVisitInput } from "../domain/UpdateVisitInput";
import { VisitNotFoundError } from "../domain/VisitNotFoundError";
import type { VisitWithMediaPrimitives } from "../domain/VisitWithMediaPrimitives";
import { VisitRepository } from "../domain/VisitRepository";

type VisitWithRelations = Visit & { media: Media[] };

@Service()
export class PrismaVisitRepository extends VisitRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: UserStorageQuotaService,
  ) {
    super();
  }

  async existsMunicipalityById(id: string): Promise<boolean> {
    const row = await this.prisma.client.municipality.findUnique({
      where: { id },
      select: { id: true },
    });
    return row !== null;
  }

  async hasUserVisitInMunicipality(
    userId: string,
    municipalityId: string,
  ): Promise<boolean> {
    const row = await this.prisma.client.visit.findFirst({
      where: { userId, municipalityId },
      select: { id: true },
    });
    return row !== null;
  }

  async countDistinctMunicipalitiesForUser(userId: string): Promise<number> {
    const rows = await this.prisma.client.visit.groupBy({
      by: ["municipalityId"],
      where: { userId },
    });
    return rows.length;
  }

  private async sizeBytesForMediaInput(
    userId: string,
    item: { type: MediaType; url: string },
  ): Promise<number | null> {
    if (item.type === "link" || !isLocalVisitUploadUrl(item.url)) {
      return null;
    }
    return statVisitUploadForUser(item.url, userId);
  }

  private mediaRowBytes(
    userId: string,
    m: Media,
  ): Promise<number> {
    if (m.type === "link" || !isLocalVisitUploadUrl(m.url)) {
      return Promise.resolve(0);
    }
    if (m.sizeBytes !== null && m.sizeBytes !== undefined) {
      return Promise.resolve(m.sizeBytes);
    }
    return statVisitUploadForUser(m.url, userId).then((n) => n ?? 0);
  }

  async create(input: CreateVisitInput): Promise<VisitWithMediaPrimitives> {
    const mediaRows = await Promise.all(
      input.media.map(async (m) => ({
        type: m.type,
        url: m.url,
        sizeBytes: await this.sizeBytesForMediaInput(input.userId, m),
      })),
    );

    const visit = await this.prisma.client.$transaction(async (tx) => {
      return tx.visit.create({
        data: {
          userId: input.userId,
          municipalityId: input.municipalityId,
          visitedAt: input.visitedAt,
          notes: input.notes ?? null,
          media:
            mediaRows.length > 0
              ? {
                  create: mediaRows.map((row) => ({
                    type: row.type,
                    url: row.url,
                    sizeBytes: row.sizeBytes,
                  })),
                }
              : undefined,
        },
        include: { media: true },
      });
    });

    return this.toVisitWithMedia(visit);
  }

  async findById(
    visitId: string,
    userId: string,
  ): Promise<VisitWithMediaPrimitives | null> {
    const row = await this.prisma.client.visit.findFirst({
      where: { id: visitId, userId },
      include: { media: true },
    });
    if (row === null) {
      return null;
    }
    return this.toVisitWithMedia(row);
  }

  async updateForUser(
    input: UpdateVisitInput,
  ): Promise<VisitWithMediaPrimitives> {
    const existing = await this.prisma.client.visit.findFirst({
      where: { id: input.visitId, userId: input.userId },
      include: { media: true },
    });
    if (existing === null) {
      throw new VisitNotFoundError(input.visitId);
    }

    const removedUploadUrls: string[] = [];
    let releaseTotal = 0;

    if (input.media !== undefined) {
      const newUrls = new Set(input.media.map((m) => m.url));
      for (const m of existing.media) {
        if (newUrls.has(m.url)) {
          continue;
        }
        if (!isLocalVisitUploadUrl(m.url)) {
          continue;
        }
        releaseTotal += await this.mediaRowBytes(input.userId, m);
        removedUploadUrls.push(m.url);
      }
    }

    const visit = await this.prisma.client.$transaction(async (tx) => {
      const stillThere = await tx.visit.findFirst({
        where: { id: input.visitId, userId: input.userId },
        select: { id: true },
      });
      if (stillThere === null) {
        throw new VisitNotFoundError(input.visitId);
      }

      if (input.media !== undefined && releaseTotal > 0) {
        await this.quota.releaseBytesTx(tx, input.userId, releaseTotal);
      }

      const data: {
        notes?: string | null;
        visitedAt?: Date;
      } = {};
      if (input.notes !== undefined) {
        data.notes = input.notes;
      }
      if (input.visitedAt !== undefined) {
        data.visitedAt = input.visitedAt;
      }

      if (Object.keys(data).length > 0) {
        await tx.visit.update({
          where: { id: input.visitId },
          data,
        });
      }

      if (input.media !== undefined) {
        await tx.media.deleteMany({ where: { visitId: input.visitId } });
        if (input.media.length > 0) {
          const rows = await Promise.all(
            input.media.map(async (m) => ({
              visitId: input.visitId,
              type: m.type,
              url: m.url,
              sizeBytes: await this.sizeBytesForMediaInput(input.userId, m),
            })),
          );
          await tx.media.createMany({
            data: rows,
          });
        }
      }

      return tx.visit.findUniqueOrThrow({
        where: { id: input.visitId },
        include: { media: true },
      });
    });

    if (removedUploadUrls.length > 0) {
      await Promise.all(
        removedUploadUrls.map((url) =>
          unlinkVisitUploadForUser(url, input.userId),
        ),
      );
    }

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

  async searchAllByUserId(
    userId: string,
  ): Promise<VisitWithMediaPrimitives[]> {
    const visits = await this.prisma.client.visit.findMany({
      where: { userId },
      orderBy: { visitedAt: "desc" },
      include: { media: true },
    });

    return visits.map((v) => this.toVisitWithMedia(v));
  }

  async deleteById(visitId: string, userId: string): Promise<boolean> {
    const visit = await this.prisma.client.visit.findFirst({
      where: { id: visitId, userId },
      include: { media: true },
    });
    if (visit === null) {
      return false;
    }

    let releaseTotal = 0;
    for (const m of visit.media) {
      releaseTotal += await this.mediaRowBytes(userId, m);
    }

    await this.prisma.client.$transaction(async (tx) => {
      if (releaseTotal > 0) {
        await this.quota.releaseBytesTx(tx, userId, releaseTotal);
      }
      await tx.visit.deleteMany({ where: { id: visitId, userId } });
    });

    await removeVisitUploadDirectory(userId, visitId);
    return true;
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
