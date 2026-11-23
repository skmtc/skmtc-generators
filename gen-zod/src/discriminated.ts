/**
 * Whether zod 4's types take a union member as a `z.discriminatedUnion`
 * option. Two references do not type-check there:
 *
 * - a reference to a model that renders `z.lazy(...)` as a whole
 *   (`ZodRef.lazyModel`), typed `z.ZodType<T>` (TS2322). An object member
 *   does that only when its cycle runs through its `additionalProperties`;
 * - a reference back to the model being built (`ZodRef.referenceBack`). Its
 *   type is still being inferred, so the getter that returns the union
 *   cannot be typed (TS7023).
 */
export const isTypedAsOption = (value: unknown): boolean =>
  typeof value !== "object" || value === null ||
  !(("lazyModel" in value && value.lazyModel === true) ||
    ("referenceBack" in value && value.referenceBack === true));
