/**
 * Whether a value is, or holds, a reference back to a model whose projection
 * is being built (`ZodRef.referenceBack`). The containers record it for their
 * children in `holdsReferenceBack`.
 */
export const holdsReferenceBack = (value: unknown): boolean =>
  typeof value === "object" && value !== null &&
  (("referenceBack" in value && value.referenceBack === true) ||
    ("holdsReferenceBack" in value && value.holdsReferenceBack === true));

/**
 * Whether zod 4's types take a union member as a `z.discriminatedUnion`
 * option. Two members do not type-check there:
 *
 * - a reference to a model that renders `z.lazy(...)` as a whole
 *   (`ZodRef.lazyModel`), typed `z.ZodType<T>` (TS2322). An object member
 *   does that only when its cycle runs through its `additionalProperties`;
 * - a member that is, or holds, a reference back to the model being built
 *   (`holdsReferenceBack`). Its type is still being inferred, so the model's
 *   own type cannot be (TS7023, TS2615).
 */
export const isTypedAsOption = (value: unknown): boolean =>
  !holdsReferenceBack(value) &&
  !(typeof value === "object" && value !== null && "lazyModel" in value &&
    value.lazyModel === true);
