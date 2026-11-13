/**
 * Whether a value holds a reference inside a cycle that nothing below it
 * defers yet. zod reads a plain reference when its module loads, and any
 * model of a cycle can be the first one loaded, so the reference has to be
 * read later: the nearest object property renders as a getter (ZodObject),
 * and with no property on the way the model renders as `z.lazy`
 * (ZodProjection).
 */
export const isDeferred = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "deferred" in value &&
  value.deferred === true;
