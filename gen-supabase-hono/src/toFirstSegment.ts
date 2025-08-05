import type { OasOperation } from '@skmtc/core'

export const toFirstSegment = ({ path }: OasOperation) => path.split('/').find(Boolean)
