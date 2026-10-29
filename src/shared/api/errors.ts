export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message || `La API respondió con HTTP ${status}`);
    this.name = "ApiError";
  }
}
