import type { CreateVisitInput } from "./CreateVisitInput";
import type { VisitWithMediaPrimitives } from "./VisitWithMediaPrimitives";

export abstract class VisitRepository {
  abstract existsMunicipalityById(id: string): Promise<boolean>;

  abstract create(input: CreateVisitInput): Promise<VisitWithMediaPrimitives>;

  abstract searchByMunicipalityId(
    municipalityId: string,
  ): Promise<VisitWithMediaPrimitives[]>;
}
