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

/**
 * Whether a value holds an intersection with a reference inside a cycle.
 * `.and(…)` reads the reference's type, and TypeScript cannot infer that type
 * while it infers the model that holds it (TS7022), not even through a getter,
 * so the model is annotated (ZodProjection).
 */
export const needsAnnotation = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "annotated" in value &&
  value.annotated === true;
