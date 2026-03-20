export type DSLErrorCode =
  | "dslNestedBlockNotAllowed"
  | "dslBlockNotClosed"
  | "dslIsolatedProperty"
  | "dslFormatError"
  | "dslUnrecognizedLine";

export interface DSLError {
  code: DSLErrorCode;
  params?: Record<string, string>;
}
