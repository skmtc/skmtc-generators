import { KtSnippet } from '@skmtc/lang-kotlin'
import { type ServiceFlavor } from '@/base.ts'
import { indent, kdoc } from '@/format.ts'
import {
  addModelImports,
  toServiceName,
  type SdkServiceOperation,
  type ServiceValueArgs
} from '@/services/serviceFacts.ts'

const fn = (flavor: ServiceFlavor) => (flavor === 'async' ? 'suspend fun' : 'fun')

/**
 * The service INTERFACE file value (§E-2) — an accumulator: the transform
 * `.add()`s each of the resource's operations as it visits them, and the value
 * renders the overload matrix (+ the raw-response view) from its own fields.
 */
export class SdkServiceValue extends KtSnippet {
  flavor: ServiceFlavor
  serviceName: string
  operations: SdkServiceOperation[] = []

  #basePackage: string
  #destinationPath: string

  constructor({ context, stem, flavor, basePackage, destinationPath, fileHeader }: ServiceValueArgs) {
    super({ context })

    this.flavor = flavor
    this.serviceName = toServiceName(stem, flavor)
    this.#basePackage = basePackage
    this.#destinationPath = destinationPath

    this.register({
      imports: {
        'com.google.errorprone.annotations': ['MustBeClosed'],
        [`${basePackage}.core`]: ['ClientOptions', 'RequestOptions'],
        [`${basePackage}.core.http`]: ['HttpResponseFor']
      },
      fileHeader,
      destinationPath
    })
  }

  /** Append one operation and register its params/response model imports. */
  add(operation: SdkServiceOperation): void {
    this.operations.push(operation)

    const imports: Record<string, string[]> = {}
    addModelImports([operation], this.#basePackage, imports)

    this.register({ imports, destinationPath: this.#destinationPath })
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
