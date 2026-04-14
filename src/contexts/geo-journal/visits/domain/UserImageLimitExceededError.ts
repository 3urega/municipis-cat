export class UserImageLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserImageLimitExceededError";
  }
}
