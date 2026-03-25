import { Service } from "diod";

import { VisitNotFoundError } from "../../domain/VisitNotFoundError";
import { VisitRepository } from "../../domain/VisitRepository";

@Service()
export class VisitRemover {
  constructor(private readonly repository: VisitRepository) {}

  async remove(visitId: string, userId: string): Promise<void> {
    const deleted = await this.repository.deleteById(visitId, userId);
    if (!deleted) {
      throw new VisitNotFoundError(visitId);
    }
  }
}
