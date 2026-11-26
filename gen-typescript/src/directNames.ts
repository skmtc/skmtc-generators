/**
 * The models that a value names with no property, item or record between,
 * and that were still being built when it named them (see
 * `TsRef.directNames`). A union and an intersection name what their members
 * do; no other value names any.
 *
 * A type alias cannot be a member of its own union or intersection that way
 * (TS2456), so TsProjection fails for a model that is in its own list.
 */
export const toDirectNames = (value: unknown): string[] =>
  typeof value === 'object' && value !== null && 'directNames' in value && Array.isArray(value.directNames)
    ? value.directNames.filter((name): name is string => typeof name === 'string')
    : []
