/** `base` if it is free, else `base2`, `base3`, … — the first name not in `taken`. */
export const toFreeName = (base: string, taken: ReadonlySet<string>, suffix = 1): string => {
  const candidate = suffix === 1 ? base : `${base}${suffix}`

  return taken.has(candidate) ? toFreeName(base, taken, suffix + 1) : candidate
}
