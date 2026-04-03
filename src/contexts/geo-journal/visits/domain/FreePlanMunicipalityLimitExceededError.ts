export class FreePlanMunicipalityLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreePlanMunicipalityLimitExceededError";
  }
}
