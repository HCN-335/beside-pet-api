/**
 * setup-status.response.ts — GET /v1/auth/setup response body.
 */
export interface SetupStatusResponse {
  /** True when the first-run setup token is outstanding (no admin yet). */
  required: boolean;
}
