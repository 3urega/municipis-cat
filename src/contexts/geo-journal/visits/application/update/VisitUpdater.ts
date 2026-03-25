import { Service } from "diod";

import type { UpdateVisitInput } from "../../domain/UpdateVisitInput";
import type { VisitWithMediaPrimitives } from "../../domain/VisitWithMediaPrimitives";
import { VisitRepository } from "../../domain/VisitRepository";

@Service()
export class VisitUpdater {
  constructor(private readonly repository: VisitRepository) {}

  async update(input: UpdateVisitInput): Promise<VisitWithMediaPrimitives> {
    return this.repository.updateForUser(input);
  }
}
