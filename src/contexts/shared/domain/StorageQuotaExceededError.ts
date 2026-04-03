export class StorageQuotaExceededError extends Error {
  constructor(message = "Storage quota exceeded") {
    super(message);
    this.name = "StorageQuotaExceededError";
  }
}
