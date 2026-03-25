import type { MunicipalityPrimitives } from "./MunicipalityPrimitives";

export abstract class MunicipalityRepository {
  abstract searchAll(userId: string): Promise<MunicipalityPrimitives[]>;
}
