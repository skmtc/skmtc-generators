/**
 * Whether zod 4's types take a union member as a `z.discriminatedUnion`
 * option. Two references are not options:
 *
 * - a reference to a model that renders `z.lazy(...)` as a whole
 *   (`ZodRef.lazyModel`), typed `z.ZodType<T>` (TS2322). An object member
 *   does that only when its cycle runs through its `additionalProperties`;
 * - a reference inside the union's own cycle (`ZodRef.inCycle`). Two facts
 *   about such a member are not known while the union is built. Its model
 *   can be under construction, so whether it renders `z.lazy(...)` is open.
 *   And on zod 4.1 to 4.5 a getter that returns `z.discriminatedUnion`
 *   cannot be typed when a member leads back to that getter through a
 *   discriminated union, the same one or another (TS7023).
 *
 * The rule takes every member of the cycle, not only the one a run is
 * building, so a union renders the same wherever a run enters its cycle.
 */
export const isTypedAsOption = (value: unknown): boolean =>
  typeof value !== "object" || value === null ||
  !(("lazyModel" in value && value.lazyModel === true) ||
    ("inCycle" in value && value.inCycle === true));
