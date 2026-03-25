import { Service } from "diod";

import type { CreateVisitInput } from "../../domain/CreateVisitInput";
import { MunicipalityNotFoundError } from "../../domain/MunicipalityNotFoundError";
import type { VisitWithMediaPrimitives } from "../../domain/VisitWithMediaPrimitives";
import { VisitRepository } from "../../domain/VisitRepository";

@Service()
export class VisitCreator {
  constructor(private readonly repository: VisitRepository) {}

  async create(input: CreateVisitInput): Promise<VisitWithMediaPrimitives> {
    const exists = await this.repository.existsMunicipalityById(
      input.municipalityId,
    );
    if (!exists) {
      throw new MunicipalityNotFoundError(input.municipalityId);
    }

    return this.repository.create(input);
  }
}
