/** Error al client quan el servidor rebutja per límit global de fotos (403). */
export class UserImageLimitExceededClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserImageLimitExceededClientError";
  }
}
