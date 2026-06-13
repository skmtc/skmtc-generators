/**
 * Schema-supplied text destined for a KDoc block: `*\u002F` would
 * terminate the comment early, so it is defused. Newlines are legal
 * inside a block comment and kept.
 */
export const toKDocText = (text: string | undefined): string | undefined => {
  return text?.replaceAll('*/', '* /')
}
