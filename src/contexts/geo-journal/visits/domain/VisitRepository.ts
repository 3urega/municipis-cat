import type { CreateVisitInput } from "./CreateVisitInput";
import type { UpdateVisitInput } from "./UpdateVisitInput";
import type { VisitWithMediaPrimitives } from "./VisitWithMediaPrimitives";

export abstract class VisitRepository {
  abstract existsMunicipalityById(id: string): Promise<boolean>;

  abstract hasUserVisitInMunicipality(
    userId: string,
    municipalityId: string,
  ): Promise<boolean>;

  abstract countDistinctMunicipalitiesForUser(userId: string): Promise<number>;

  abstract create(input: CreateVisitInput): Promise<VisitWithMediaPrimitives>;

  abstract findById(
    visitId: string,
    userId: string,
  ): Promise<VisitWithMediaPrimitives | null>;

  abstract updateForUser(
    input: UpdateVisitInput,
  ): Promise<VisitWithMediaPrimitives>;

  abstract searchByMunicipalityId(
    municipalityId: string,
    userId: string,
  ): Promise<VisitWithMediaPrimitives[]>;

  /** Totes les visites de l’usuari, més recents primer. */
  abstract searchAllByUserId(
    userId: string,
  ): Promise<VisitWithMediaPrimitives[]>;

  /** Esborra una visita només si pertany a l’usuari. Retorna si s’ha esborrat. */
  abstract deleteById(visitId: string, userId: string): Promise<boolean>;
}
