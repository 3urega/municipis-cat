/** Error llançat al client quan POST imatge retorna quota (507). */
export class StorageQuotaExceededClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageQuotaExceededClientError";
  }
}
