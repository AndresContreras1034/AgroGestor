export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message || `La API respondió con HTTP ${status}`);
    this.name = "ApiError";
  }

  get noConnection() {
    return this.status === 0;
  }
}
