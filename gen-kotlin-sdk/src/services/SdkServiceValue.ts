import type { GenerateContextType, OasOperation } from '@skmtc/core'
import { KtSnippet } from '@skmtc/lang-kotlin'
import invariant from 'tiny-invariant'
import { resolveEnrichment, toClassStem, type ServiceFlavor } from '@/base.ts'
import { toSdkConfig } from '@/config.ts'
import { indent, kdoc } from '@/format.ts'
import {
  addModelImports,
  toServiceName,
  toServiceOperations,
  type SdkServiceOperation
} from '@/services/toServiceOperations.ts'

type SdkServiceValueArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
  flavor: ServiceFlavor
}

const fn = (flavor: ServiceFlavor) => (flavor === 'async' ? 'suspend fun' : 'fun')

/**
 * The service INTERFACE file value (§E-2). Self-contained: it computes its
 * own resource operations in the constructor and renders the overload matrix
 * (+ the raw-response view) from its own fields.
 */
export class SdkServiceValue extends KtSnippet {
  flavor: ServiceFlavor
  serviceName: string
  operations: SdkServiceOperation[]

  constructor({ context, operation, destinationPath, flavor }: SdkServiceValueArgs) {
    super({ context })

    const config = toSdkConfig(context)
    const enrichment = resolveEnrichment(context)(operation)

    invariant(enrichment, '@skmtc/gen-kotlin-sdk: service projection requires an enrichment')

    const stem = toClassStem(enrichment)

    this.flavor = flavor
    this.serviceName = toServiceName(stem, flavor)
    this.operations = toServiceOperations({
      context,
      config,
      stem,
      resource: enrichment.resource,
      resolveEnrichment: resolveEnrichment(context)
    })

    const imports: Record<string, string[]> = {
      'com.google.errorprone.annotations': ['MustBeClosed'],
      [`${config.basePackage}.core`]: ['ClientOptions', 'RequestOptions'],
      [`${config.basePackage}.core.http`]: ['HttpResponseFor']
    }

    addModelImports(this.operations, config.basePackage, imports)

    this.register({ imports, fileHeader: config.fileHeader, destinationPath })
  }

  override toString(): string {
    const sections = [
      kdoc([
        'Returns a view of this service that provides access to raw HTTP responses for each method.'
      ]) + '\nfun withRawResponse(): WithRawResponse',
      kdoc([
        'Returns a view of this service with the given option modifications applied.',
        '',
        'The original service is not modified.'
      ]) + `\nfun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${this.serviceName}`,
      ...this.operations.flatMap(operation => this.#methods(operation, false)),
      this.#rawView()
    ]

    return `\n${sections.join('\n\n')}`
  }

  #rawView(): string {
    const members = [
      kdoc([
        'Returns a view of this service with the given option modifications applied.',
        '',
        'The original service is not modified.'
      ]) +
        `\nfun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${this.serviceName}.WithRawResponse`,
      ...this.operations.flatMap(operation => this.#methods(operation, true))
    ]

    return (
      kdoc([
        `A view of [${this.serviceName}] that provides access to raw HTTP responses for each method.`
      ]) + `\ninterface WithRawResponse {\n\n${indent(members.join('\n\n'), 1)}\n}`
    )
  }

  #methods(operation: SdkServiceOperation, raw: boolean): string[] {
    const { methodName, paramsClassName, pathParam, hasNone } = operation
    const returnType = raw
      ? `HttpResponseFor<${operation.responseClassName}>`
      : operation.responseClassName
    const annotation = raw ? '@MustBeClosed\n' : ''
    const declaration = fn(this.flavor)

    const headKdoc = raw
      ? kdoc([
          `Returns a raw HTTP response for \`${operation.httpVerb.toLowerCase()} ${operation.path}\`, but is otherwise the same as [${this.serviceName}.${methodName}].`
        ])
      : kdoc([operation.description])

    const seeKdoc = kdoc([`@see ${methodName}`])

    if (pathParam) {
      const pp = pathParam.kotlinName
      // With required query params there is no `none()`: the params
      // argument loses its default and the (pathArg, requestOptions)
      // convenience overload disappears (corpus: ArrivalAndDeparture).
      const paramsArg = hasNone
        ? `params: ${paramsClassName} = ${paramsClassName}.none(),`
        : `params: ${paramsClassName},`

      const overloads = [
        `${headKdoc}\n${annotation}${declaration} ${methodName}(\n` +
          indent(
            [`${pp}: String,`, paramsArg, 'requestOptions: RequestOptions = RequestOptions.none(),'].join(
              '\n'
            ),
            1
          ) +
          `\n): ${returnType} = ${methodName}(params.toBuilder().${pp}(${pp}).build(), requestOptions)`,

        `${seeKdoc}\n${annotation}${declaration} ${methodName}(\n` +
          indent(
            [`params: ${paramsClassName},`, 'requestOptions: RequestOptions = RequestOptions.none(),'].join(
              '\n'
            ),
            1
          ) +
          `\n): ${returnType}`
      ]

      if (hasNone) {
        overloads.push(
          `${seeKdoc}\n${annotation}${declaration} ${methodName}(${pp}: String, requestOptions: RequestOptions): ${returnType} =\n` +
            `    ${methodName}(${pp}, ${paramsClassName}.none(), requestOptions)`
        )
      }

      return overloads
    }

    if (hasNone) {
      return [
        `${headKdoc}\n${annotation}${declaration} ${methodName}(\n` +
          indent(
            [
              `params: ${paramsClassName} = ${paramsClassName}.none(),`,
              'requestOptions: RequestOptions = RequestOptions.none(),'
            ].join('\n'),
            1
          ) +
          `\n): ${returnType}`,

        `${seeKdoc}\n${annotation}${declaration} ${methodName}(requestOptions: RequestOptions): ${returnType} =\n` +
          `    ${methodName}(${paramsClassName}.none(), requestOptions)`
      ]
    }

    return [
      `${headKdoc}\n${annotation}${declaration} ${methodName}(\n` +
        indent(
          [`params: ${paramsClassName},`, 'requestOptions: RequestOptions = RequestOptions.none(),'].join(
            '\n'
          ),
          1
        ) +
        `\n): ${returnType}`
    ]
  }
}
