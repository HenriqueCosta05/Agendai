const FOREIGN_KEY_VIOLATION = '23503';
const UNIQUE_VIOLATION = '23505';

const pgCode = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { code, cause } = error as { code?: unknown; cause?: unknown };
  return typeof code === 'string' ? code : pgCode(cause);
};

export const isForeignKeyViolation = (error: unknown) => pgCode(error) === FOREIGN_KEY_VIOLATION;

export const isUniqueViolation = (error: unknown) => pgCode(error) === UNIQUE_VIOLATION;
