import type {
  GenerateContextType,
  GqlOperation,
  Identifier,
  OasRef,
  OasSchema
} from '@skmtc/core'
import { Definition, toGeneratorOnlyKey, synthesizeArgsObject, toGqlOperationEntry } from '@skmtc/core'
import { TsProjection } from '@skmtc/gen-typescript'
import { toExportPath, toBaseIdentifier } from './base.ts'
import denoJson from '../deno.json' with { type: 'json' }

const id = denoJson.name

/**
 * Emit a typed args/result contract for a single GraphQL root field.
 *
 * Per-operation output, e.g. for `query getUser(id: ID!): User`:
 *
 * ```ts
 * import type { User } from '@/types/user.generated.ts'
 *
 * export type GetUserArgs = { id: string }
 * export type GetUserResult = User
 * ```
 *
 * The generator does not synthesize a query string or a transport
 * function — those are downstream concerns. Consumers typically wire
 * these types into their preferred GraphQL client (a `TypedDocumentNode`
 * adapter or a hand-written request helper).
 */
const emitOperation = (context: GenerateContextType, operation: GqlOperation): void => {
  const exportPath = toExportPath(operation)
  const base = toBaseIdentifier(operation)

  const generatorKey = toGeneratorOnlyKey({ generatorId: id })

  // Result type: prefer a ref to the registered model so the typed
  // identity is shared, otherwise inline through the TS projection.
  const resultIdentifier = emitResult({
    context,
    returnType: operation.returnType,
    base,
    exportPath,
    generatorKey
  })

  // Args type: synthesize an OasObject and route it through TsProjection
  // so it picks up the same scalar/format mapping as everything else.
  const argsObject = synthesizeArgsObject(operation)
  if (argsObject !== undefined) {
    context.insertNormalisedModel(
      TsProjection,
      {
        schema: argsObject,
        fallbackName: `${base}Args`,
        destinationPath: exportPath
      }
    )
  } else {
    // No arguments: still emit an empty record alias so the consumer can
    // reference the type uniformly.
    const emptyArgsId = TsProjection.createIdentifier(`${base}Args`)
    context.register({
      destinationPath: exportPath,
      definitions: [
        new Definition({
          context,
          identifier: emptyArgsId,
          value: {
            generatorKey,
            toString: () => 'Record<string, never>'
          }
        })
      ]
    })
  }

  // Note: `emitResult` already registered the identifier and any imports
  // needed; nothing more to do here. Returning the identifier to allow
  // callers (or future composition) to reference it.
  void resultIdentifier
}

type EmitResultArgs = {
  context: GenerateContextType
  returnType: OasSchema | OasRef<'schema'>
  base: string
  exportPath: string
  generatorKey: ReturnType<typeof toGeneratorOnlyKey>
}

/**
 * Emit the `<Base>Result` type for an operation's return shape.
 *
 * For ref returns, inserts the referenced model via `TsProjection` and
 * emits a `type FooResult = ReferencedType` alias plus the import.
 * For inline returns, routes the schema through `insertNormalisedModel`
 * to materialize a TS type alias under the `Result` name.
 */
const emitResult = ({
  context,
  returnType,
  base,
  exportPath,
  generatorKey
}: EmitResultArgs): Identifier => {
  const resultId = TsProjection.createIdentifier(`${base}Result`)

  if (returnType.isRef()) {
    // Ensure the model's TS file is generated (idempotent if already done).
    const inserted = context.insertModel(TsProjection, returnType.toRefName())
    const targetName = inserted.settings.identifier.name
    const targetPath = inserted.settings.exportPath

    // Register an alias `type <Base>Result = ReferencedType` plus the import.
    context.register({
      destinationPath: exportPath,
      imports: { [targetPath]: [targetName] },
      definitions: [
        new Definition({
          context,
          identifier: resultId,
          value: {
            generatorKey,
            toString: () => targetName
          }
        })
      ]
    })
  } else {
    // Inline schema — synthesize a TS type via insertNormalisedModel
    // under the result name itself.
    context.insertNormalisedModel(
      TsProjection,
      {
        schema: returnType,
        fallbackName: `${base}Result`,
        destinationPath: exportPath
      }
    )
  }

  return resultId
}

/**
 * The gen-graphql-operation generator entry.
 *
 * Built via {@link toGqlOperationEntry} so it's typed end-to-end against
 * `GqlOperation` (no runtime cast) and the dispatcher routes it only
 * against GraphQL documents.
 */
export const graphqlOperationEntry = toGqlOperationEntry({
  id,
  isSupported: () => true,
  transform: ({ context, operation, acc }) => {
    emitOperation(context, operation)
    return acc
  }
})
