import type { MunicipalityPrimitives } from "./MunicipalityPrimitives";

export abstract class MunicipalityRepository {
  abstract searchAll(): Promise<MunicipalityPrimitives[]>;
}
