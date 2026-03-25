export class MunicipalityNotFoundError extends Error {
  constructor(public readonly municipalityId: string) {
    super(`Municipality not found: ${municipalityId}`);
    this.name = "MunicipalityNotFoundError";
  }
}
