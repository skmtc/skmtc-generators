import type { GenerateContextType } from '@skmtc/core'
import * as v from 'valibot'
import { generatorSchema } from './enrichments.ts'
import { effectSchemaEntry } from './mod.ts'

/**
 * The generator-scoped settings, read off the context so they reach a
 * value built by a peer (a route generator's parameter objects) as well
 * as one built by the projection.
 */
const readGeneratorSettings = (context: GenerateContextType) =>
  v.parse(
    generatorSchema,
    context.readEnrichment([effectSchemaEntry.id, '_generator']),
  )

/** Whether this project renders defaults. */
export const rendersDefaults = (context: GenerateContextType): boolean =>
  readGeneratorSettings(context)?.defaults ?? false

/** Whether this project renders string enums open. */
export const rendersOpenEnums = (context: GenerateContextType): boolean =>
  readGeneratorSettings(context)?.openEnums ?? false
