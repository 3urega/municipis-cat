import { Service } from "diod";

import type { MunicipalityPrimitives } from "../../domain/MunicipalityPrimitives";
import { MunicipalityRepository } from "../../domain/MunicipalityRepository";

@Service()
export class AllMunicipalitiesSearcher {
  constructor(private readonly repository: MunicipalityRepository) {}

  async searchAll(): Promise<MunicipalityPrimitives[]> {
    return this.repository.searchAll();
  }
}
