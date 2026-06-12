import type { GenerateContextType, Stringable } from '@skmtc/core'
import type { SharedHashes } from '@/model/structuralHash.ts'
import type { SdkBody } from '@/params/SdkParams.ts'
import { AbsentBody } from '@/params/body/AbsentBody.ts'
import { MapBody } from '@/params/body/MapBody.ts'
import { ModelBody } from '@/params/body/ModelBody.ts'
import { RefBody } from '@/params/body/RefBody.ts'

/**
 * What a request-body shape contributes to each section of a Params
 * class. The shape is chosen ONCE (the `toBodySnippet` router below);
 * every section Snippet reads these members and never asks which
 * shape it is. `lead` members sit in the params position; `tail`
 * members after the headers/query members (the map shape's
 * `additionalBodyProperties` axis sits last — corpus:
 * AuthRuleV2DeleteParams).
 */
export type BodySnippet = {
  constructorLeadLines: string[]
  constructorTailLines: string[]
  accessorSections: Stringable[]
  builderLeadVariables: string[]
  builderTailVariables: string[]
  fromLeadAssignments(fromParameter: string): string[]
  fromTailAssignments(fromParameter: string): string[]
  /** Setter blocks BEFORE the fixed additional-headers/query block. */
  setterSections: Stringable[]
  /** Setter blocks AFTER it (the map shape's self-managed ops). */
  tailSetterSections: Stringable[]
  buildLeadArguments: string[]
  buildTailArguments: string[]
  /** The `fun _body()` section ([] when the operation has no body). */
  bodyMethodSections: string[]
  /** Nested class sections (the model shape's Body class). */
  nestedSections: Stringable[]
  equalsLeadNames: string[]
  equalsTailNames: string[]
  /** Construction axis: blocks `none()`. */
  hasRequired: boolean
  /** Fence axis: entries in the required-fields KDoc fences. */
  fenceFields: string[]
}

type Args = {
  context: GenerateContextType
  body: SdkBody | undefined
  destinationPath: string
  sharedHashes: SharedHashes
}

/** The ONE place the body shape is decided (generator-code-quality.md, Rule 3). */
export const toBodySnippet = ({ context, body, destinationPath, sharedHashes }: Args): BodySnippet => {
  switch (body?.kind) {
    case 'model':
      return new ModelBody({
        context,
        className: body.className,
        schema: body.schema,
        destinationPath,
        sharedHashes
      })
    case 'ref':
      return new RefBody({ context, body, destinationPath })
    case 'map':
      return new MapBody({ context, destinationPath })
    case undefined:
      return new AbsentBody({ context })
    default: {
      const _exhaustive: never = body
      throw new Error(`Unhandled SdkBody: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
