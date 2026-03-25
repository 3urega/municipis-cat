export class VisitNotFoundError extends Error {
  constructor(public readonly visitId: string) {
    super(`Visit not found: ${visitId}`);
    this.name = "VisitNotFoundError";
  }
}
