import { Service } from "diod";

import { VisitNotFoundError } from "../../domain/VisitNotFoundError";
import type { VisitWithMediaPrimitives } from "../../domain/VisitWithMediaPrimitives";
import { VisitRepository } from "../../domain/VisitRepository";

@Service()
export class VisitFinder {
  constructor(private readonly repository: VisitRepository) {}

  async find(
    visitId: string,
    userId: string,
  ): Promise<VisitWithMediaPrimitives> {
    const row = await this.repository.findById(visitId, userId);
    if (row === null) {
      throw new VisitNotFoundError(visitId);
    }
    return row;
  }
}
