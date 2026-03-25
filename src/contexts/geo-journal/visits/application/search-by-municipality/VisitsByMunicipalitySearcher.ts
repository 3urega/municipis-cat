import { Service } from "diod";

import type { VisitWithMediaPrimitives } from "../../domain/VisitWithMediaPrimitives";
import { VisitRepository } from "../../domain/VisitRepository";

@Service()
export class VisitsByMunicipalitySearcher {
  constructor(private readonly repository: VisitRepository) {}

  async search(
    municipalityId: string,
    userId: string,
  ): Promise<VisitWithMediaPrimitives[]> {
    return this.repository.searchByMunicipalityId(municipalityId, userId);
  }
}
