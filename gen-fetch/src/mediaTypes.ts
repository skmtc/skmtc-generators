const isJson = (mediaType: string): boolean => /^application\/(?:[\w.+-]+\+)?json\s*(?:;|$)/i.test(mediaType)

/** `application/json` if offered, else the first `+json` media type. */
export const toJsonMediaType = (mediaTypes: string[]): string | undefined =>
  mediaTypes.find(mediaType => mediaType.toLowerCase() === 'application/json') ?? mediaTypes.find(isJson)
