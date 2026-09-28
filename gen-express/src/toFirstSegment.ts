import type { OasOperation } from '@skmtc/core'

/**
 * The folder an operation's routes and services live in: the path's first
 * segment. A path with no segment (`/`) has no folder to name, so it lands in
 * `root`, the name gen-md-docs gives the same path.
 */
export const toFirstSegment = ({ path }: Pick<OasOperation, 'path'>): string =>
  path.split('/').find(Boolean) ?? 'root'
