/**
 * Whether a value renders one or more literal values (`z.literal`,
 * `z.enum`), which `z.discriminatedUnion` reads to tell its options apart.
 */
export const isLiteral = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "literal" in value &&
  value.literal === true;

/**
 * The properties of an object value that hold literal values (see
 * `ZodObject.literalKeys`), or none for any other value.
 */
export const toLiteralKeys = (value: unknown): string[] =>
  typeof value === "object" && value !== null && "literalKeys" in value &&
    Array.isArray(value.literalKeys)
    ? value.literalKeys.filter((key): key is string => typeof key === "string")
    : [];

/**
 * Whether `z.discriminatedUnion` can take a value as an option switched on
 * `key`. zod 4 takes only objects there, and reads each option's literal
 * values for the key when it first parses. A nullable object and any other
 * value fail to type-check, and an object whose `key` holds no literal throws at that
 * first parse. A reference back passes: its model is still being built, so
 * nothing says yet that it cannot.
 */
export const isDiscriminable = (value: unknown, key: string): boolean => {
  if (typeof value !== "object" || value === null || !("literalKeys" in value)) {
    return false;
  }

  return value.literalKeys === undefined || toLiteralKeys(value).includes(key);
};
