/**
 * Whether a value is a reference to a model that renders `z.lazy(...)` as a
 * whole (`ZodRef.lazyModel`). An object member does that only when its cycle
 * runs through its `additionalProperties`: `.catchall` takes a schema, not a
 * getter. The model is then typed `z.ZodType<T>`, which zod 4 does not type
 * as a `z.discriminatedUnion` option (TS2322).
 */
export const isLazyModel = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "lazyModel" in value &&
  value.lazyModel === true;
