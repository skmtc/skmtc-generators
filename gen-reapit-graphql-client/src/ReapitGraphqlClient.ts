import {
  capitalize,
  Identifier,
  OasObject,
  synthesizeArgsObject,
  toGeneratorOnlyKey,
  type GqlOperationProjectionConstructorArgs
} from '@skmtc/core'
import { TsProjection } from '@skmtc/gen-typescript'
import { ReapitGraphqlClientBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { toSelection } from './selection/toSelection.ts'
import denoJson from '../deno.json' with { type: 'json' }

const id = denoJson.name

/**
 * GraphQL operation → React Query hook + TypedDocumentNode.
 *
 * Per operation, emits one self-contained .generated.ts file with:
 *   - Result and Variables TS types (via gen-typescript on the
 *     operation's wrapped return shape and synthesized args)
 *   - The query/mutation document string, cast to TypedDocumentNode
 *     for type inference through graphql-request
 *   - The hook (useQuery for queries, useMutation for mutations)
 *
 * Consumers (forms, lists, custom inputs) compose against this
 * generator via `context.insertOperation` and call the produced hook
 * by name. The Driver dedupes — N consumers of the same operation
 * yield one hook file with N correctly-registered import statements.
 */
export class ReapitGraphqlClient extends ReapitGraphqlClientBase {
  resultTypeName: string
  variablesTypeName: string | null
  documentConstName: string

  constructor({
    context,
    operation,
    settings
  }: GqlOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const fieldName = operation.fieldName
    const isMutation = operation.rootKind === 'mutation'

    // Wrap return type as { [fieldName]: <returnType> } so emitted TS is
    // shaped like a GraphQL response, not the bare model. Required so
    // consumers access `data.GetOffices._embedded` (not `data._embedded`).
    const wrappedResult = new OasObject({
      title: `${capitalize(fieldName)} ${isMutation ? 'mutation' : 'query'} response`,
      properties: {
        [fieldName]: operation.returnType
      },
      required: [fieldName]
    })

    const resultDef = this.insertNormalizedModel(TsProjection, {
      schema: wrappedResult,
      fallbackName: `${capitalize(fieldName)}${isMutation ? 'Mutation' : 'Query'}`
    })
    this.resultTypeName = resultDef.identifier.name

    const argsObject = synthesizeArgsObject(operation)
    if (argsObject) {
      const variablesDef = this.insertNormalizedModel(TsProjection, {
        schema: argsObject,
        fallbackName: `${capitalize(fieldName)}${isMutation ? 'Mutation' : 'Query'}Variables`
      })
      this.variablesTypeName = variablesDef.identifier.name
    } else {
      this.variablesTypeName = null
    }

    // Build the GraphQL document string. arg.gqlType preserves the
    // original SDL type ('ID!', 'CreatePostInput!', '[String!]') so we
    // don't have to reverse-engineer it from the OAS form.
    const argsDecl = operation.arguments.length
      ? `(${operation.arguments.map(a => `$${a.name}: ${a.gqlType}`).join(', ')})`
      : ''
    const argsPass = operation.arguments.length
      ? `(${operation.arguments.map(a => `${a.name}: $${a.name}`).join(', ')})`
      : ''

    const selection = toSelection({ schema: operation.returnType })
    const documentBody = `${operation.rootKind} ${capitalize(fieldName)}${argsDecl} {
  ${fieldName}${argsPass}${selection.asDocumentSuffix()}
}`

    this.documentConstName = `${capitalize(fieldName)}Document`

    this.defineAndRegister({
      identifier: Identifier.createVariable(this.documentConstName),
      value: {
        generatorKey: toGeneratorOnlyKey({ generatorId: id }),
        // The cast-string approach: emit a plain query string typed as
        // TypedDocumentNode<Result, Variables>. graphql-request reads
        // the string at runtime; TS reads the type for inference.
        // Avoids pulling the `graphql` parser into the runtime bundle.
        toString: () =>
          `\`${documentBody}\` as unknown as TypedDocumentNode<${this.resultTypeName}, ${this.variablesTypeName ?? 'Record<string, never>'}>`
      }
    })

    this.register({
      imports: {
        '@graphql-typed-document-node/core': ['TypedDocumentNode'],
        '@/lib/graphql-client': ['graphql'],
        '@tanstack/react-query': isMutation ? ['useMutation'] : ['useQuery']
      }
    })
  }

  override toString(): string {
    const isMutation = this.operation.rootKind === 'mutation'
    const fieldName = this.operation.fieldName

    if (isMutation) {
      // Mutations always take variables (otherwise no point — they
      // exist to write something). Variables surface on `mutate()`,
      // not on the hook itself, matching the canonical RQ pattern.
      const varsType = this.variablesTypeName ?? 'Record<string, never>'
      return `(options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => useMutation({
  mutationFn: (variables: ${varsType}) =>
    graphql.request<${this.resultTypeName}, ${varsType}>(${this.documentConstName}, variables),
  onSuccess: options?.onSuccess,
  onError: options?.onError
})`
    }

    // Query: variables go on the hook call (so the queryKey can include
    // them and RQ caches per-variable-shape).
    if (this.variablesTypeName) {
      return `(variables: ${this.variablesTypeName} = {} as ${this.variablesTypeName}) => useQuery({
  queryKey: ['${fieldName}', variables] as const,
  queryFn: () => graphql.request<${this.resultTypeName}, ${this.variablesTypeName}>(${this.documentConstName}, variables)
})`
    }

    return `() => useQuery({
  queryKey: ['${fieldName}'] as const,
  queryFn: () => graphql.request<${this.resultTypeName}>(${this.documentConstName})
})`
  }
}
