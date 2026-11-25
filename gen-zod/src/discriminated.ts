/**
 * Whether zod 4's types take a union member as a `z.discriminatedUnion`
 * option. Two references do not type-check there:
 *
 * - a reference to a model typed `z.ZodType<T>` (`ZodRef.annotatedModel`,
 *   TS2322). An object member is that only when its cycle runs through its
 *   `additionalProperties`, or through an intersection;
 * - a reference back to the model being built (`ZodRef.referenceBack`). Its
 *   type is still being inferred, so the getter that returns the union
 *   cannot be typed (TS7023).
 */
export const isTypedAsOption = (value: unknown): boolean =>
  typeof value !== "object" || value === null ||
  !(("annotatedModel" in value && value.annotatedModel === true) ||
    ("referenceBack" in value && value.referenceBack === true));
