import type { Prisma } from "@prisma/client";
import { Service } from "diod";

import { StorageQuotaExceededError } from "@/contexts/shared/domain/StorageQuotaExceededError";
import { PrismaService } from "@/contexts/shared/infrastructure/prisma/PrismaService";
import {
  isStorageUnlimitedRole,
  limitBytesForPlan,
} from "@/lib/storage/userPlanLimits";

@Service()
export class UserStorageQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reserva espacio en BD y desa el fitxer; si desa falla, compensa el increment.
   */
  async reserveBytes(
    userId: string,
    delta: number,
    fileWrite: () => Promise<void>,
  ): Promise<void> {
    if (delta <= 0) {
      await fileWrite();
      return;
    }
    await this.prisma.client.$transaction(async (tx) => {
      await this.assertCanReserveTx(tx, userId, delta);
      await tx.user.update({
        where: { id: userId },
        data: { storageUsed: { increment: BigInt(delta) } },
      });
    });
    try {
      await fileWrite();
    } catch (err) {
      await this.prisma.client.$transaction(async (tx) => {
        await this.releaseBytesTx(tx, userId, delta);
      });
      throw err;
    }
  }

  /**
   * Allibera espai (esborrat de mitjans o visita).
   */
  async releaseBytes(userId: string, delta: number): Promise<void> {
    if (delta <= 0) {
      return;
    }
    await this.prisma.client.$transaction(async (tx) => {
      await this.releaseBytesTx(tx, userId, delta);
    });
  }

  async assertCanReserveTx(
    tx: Prisma.TransactionClient,
    userId: string,
    delta: number,
  ): Promise<void> {
    if (delta <= 0) {
      return;
    }
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { storageUsed: true, plan: true, role: true },
    });
    if (isStorageUnlimitedRole(user.role)) {
      return;
    }
    const limit = BigInt(limitBytesForPlan(user.plan));
    if (user.storageUsed + BigInt(delta) > limit) {
      throw new StorageQuotaExceededError();
    }
  }

  async releaseBytesTx(
    tx: Prisma.TransactionClient,
    userId: string,
    delta: number,
  ): Promise<void> {
    if (delta <= 0) {
      return;
    }
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { storageUsed: true },
    });
    const next = user.storageUsed - BigInt(delta);
    const zero = BigInt(0);
    await tx.user.update({
      where: { id: userId },
      data: { storageUsed: next < zero ? zero : next },
    });
  }
}
