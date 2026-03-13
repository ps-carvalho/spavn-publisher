/**
 * Custom error class for Publisher API errors.
 * Captures HTTP status, error code, message, and additional details.
 */
export class PublisherApiError extends Error {
  /** HTTP status code (e.g., 400, 401, 404, 500) */
  public readonly status: number

  /** API-specific error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND') */
  public readonly code: string

  /** Additional error details (e.g., validation errors) */
  public readonly detail?: unknown

  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message)
    this.name = 'PublisherApiError'
    this.status = status
    this.code = code
    this.detail = detail

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PublisherApiError)
    }
  }

  /**
   * Check if this error is a client error (4xx)
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  /**
   * Check if this error is a server error (5xx)
   */
  get isServerError(): boolean {
    return this.status >= 500
  }

  /**
   * Check if this is a specific status code
   */
  isStatus(status: number): boolean {
    return this.status === status
  }

  /**
   * String representation for logging
   */
  override toString(): string {
    return `${this.name} [${this.status} ${this.code}]: ${this.message}`
  }
}
