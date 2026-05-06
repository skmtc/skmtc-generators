import {
  Definition,
  Identifier,
  toGeneratorOnlyKey,
  toGqlOperationEntry,
  type GenerateContextType,
  type GqlOperation,
  type GqlArgument,
  type OasSchema,
  type OasRef
} from '@skmtc/core'
import { toExportPath, toBaseIdentifier } from '@skmtc/gen-graphql-operation'
import denoJson from '../deno.json' with { type: 'json' }

const id = denoJson.name

/**
 * Module path for `graphql-tag`'s `gql` template-literal tag. Using
 * the named-export form (`import { gql }`) which graphql-tag supports
 * since v2.10.
 */
const GQL_TAG_PATH = 'graphql-tag'

/**
 * Module path for `TypedDocumentNode`. The package is type-only at
 * runtime — its sole export is an empty interface — so it costs the
 * consumer nothing at runtime.
 */
const TYPED_DOC_PATH = '@graphql-typed-document-node/core'

const ROOT_KIND_KEYWORD: Record<GqlOperation['rootKind'], string> = {
  query: 'query',
  mutation: 'mutation',
  subscription: 'subscription'
}

/**
 * Builds an SDL stub for an operation:
 *
 * ```graphql
 * query GetUser($id: ID!) {
 *   getUser(id: $id) {
 *     # TODO: select fields
 *   }
 * }
 * ```
 *
 * For leaf return types (Int, String, scalar, enum) the selection
 * set is omitted — those fields can't carry sub-selections.
 */
const buildStub = (operation: GqlOperation): string => {
  const keyword = ROOT_KIND_KEYWORD[operation.rootKind]
  const operationName = capitalize(operation.fieldName)

  const variableDecls = operation.arguments
    .map((arg: GqlArgument) => `$${arg.name}: ${arg.gqlType || 'unknown'}`)
    .join(', ')

  const variableUses = operation.arguments
    .map((arg: GqlArgument) => `${arg.name}: $${arg.name}`)
    .join(', ')

  const argList = operation.arguments.length > 0 ? `(${variableUses})` : ''
  const variableHeader = operation.arguments.length > 0 ? `(${variableDecls})` : ''

  const selectionSet = isCompositeReturn(operation.returnType)
    ? ` {\n    # TODO: select fields\n  }`
    : ''

  return `${keyword} ${operationName}${variableHeader} {\n  ${operation.fieldName}${argList}${selectionSet}\n}`
}

/**
 * Drills through array / nullable-union wrappers to determine whether
 * the operation's return type carries any composite (object / union)
 * member that requires a selection set in the SDL stub.
 */
const isCompositeReturn = (schema: OasSchema | OasRef<'schema'>): boolean => {
  if (schema.isRef()) return true
  if (schema.type === 'array') return isCompositeReturn(schema.items)
  if (schema.type === 'union') return schema.members.some(m => isCompositeReturn(m))
  if (schema.type === 'object') return true
  return false
}

const capitalize = (s: string): string => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1))

/**
 * Emits the `<Base>Document` constant for one GraphQL operation.
 *
 * Writes into the same file as `gen-graphql-operation`'s args/result
 * types so the document can reference them locally without an import.
 * Pair this generator with `gen-graphql-operation`; running it
 * standalone produces a file that references undefined types.
 */
const emitOperation = (context: GenerateContextType, operation: GqlOperation): void => {
  const exportPath = toExportPath(operation)
  const base = toBaseIdentifier(operation)
  const generatorKey = toGeneratorOnlyKey({ generatorId: id })

  const docName = `${base}Document`
  const resultName = `${base}Result`
  const argsName = `${base}Args`

  const docId = Identifier.createVariable(
    docName,
    `TypedDocumentNode<${resultName}, ${argsName}>`
  )

  const stub = buildStub(operation)

  context.register({
    destinationPath: exportPath,
    imports: {
      [GQL_TAG_PATH]: ['gql'],
      [TYPED_DOC_PATH]: ['TypedDocumentNode']
    },
    definitions: [
      new Definition({
        context,
        identifier: docId,
        value: {
          generatorKey,
          toString: () => `gql\`\n${stub}\n\``
        }
      })
    ]
  })
}

/**
 * Generator entry. Pair with `@skmtc/gen-graphql-operation` so the
 * `<Base>Args` and `<Base>Result` types referenced by each Document
 * actually exist in the same emitted file.
 */
export const graphqlTypedDocumentNodeEntry = toGqlOperationEntry({
  id,
  isSupported: () => true,
  transform: ({ context, operation, acc }) => {
    emitOperation(context, operation)
    return acc
  }
})
