export type DSLErrorCode =
  | "dslNestedBlockNotAllowed"
  | "dslBlockNotClosed"
  | "dslUnexpectedBlockEnd"
  | "dslMaxDepthExceeded"
  | "dslIsolatedProperty"
  | "dslFormatError"
  | "dslUnrecognizedLine";

export interface DSLError {
  code: DSLErrorCode;
  params?: Record<string, string>;
}
