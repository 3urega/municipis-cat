import { Service } from "diod";

import type { CreateVisitInput } from "../../domain/CreateVisitInput";
import { MunicipalityNotFoundError } from "../../domain/MunicipalityNotFoundError";
import type { VisitWithMediaPrimitives } from "../../domain/VisitWithMediaPrimitives";
import { VisitRepository } from "../../domain/VisitRepository";
import { VisitMunicipalityLimitGuard } from "./VisitMunicipalityLimitGuard";

@Service()
export class VisitCreator {
  constructor(
    private readonly repository: VisitRepository,
    private readonly municipalityLimit: VisitMunicipalityLimitGuard,
  ) {}

  async create(input: CreateVisitInput): Promise<VisitWithMediaPrimitives> {
    const exists = await this.repository.existsMunicipalityById(
      input.municipalityId,
    );
    if (!exists) {
      throw new MunicipalityNotFoundError(input.municipalityId);
    }

    await this.municipalityLimit.assertAllowsNewVisitToMunicipality(
      input.userId,
      input.municipalityId,
    );

    return this.repository.create(input);
  }
}
