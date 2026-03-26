import { Service } from "diod";

import type { VisitWithMediaPrimitives } from "../../domain/VisitWithMediaPrimitives";
import { VisitRepository } from "../../domain/VisitRepository";

@Service()
export class VisitsForExplorerSearcher {
  constructor(private readonly repository: VisitRepository) {}

  async search(userId: string): Promise<VisitWithMediaPrimitives[]> {
    return this.repository.searchAllByUserId(userId);
  }
}
