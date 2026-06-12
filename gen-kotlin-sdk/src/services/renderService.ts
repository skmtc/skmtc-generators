import { indent, kdoc } from '../model/renderModel.ts'
import type { SdkService, SdkServiceOperation } from './SdkService.ts'

export type ServiceFlavor = 'blocking' | 'async'

const suffix = (flavor: ServiceFlavor) => (flavor === 'async' ? 'Async' : '')

const fn = (flavor: ServiceFlavor) => (flavor === 'async' ? 'suspend fun' : 'fun')

export const toServiceName = (service: SdkService, flavor: ServiceFlavor): string =>
  `${service.stem}Service${suffix(flavor)}`

/** The service interface body (§E-2 overload matrix + raw-view mirror). */
export const renderServiceBody = (service: SdkService, flavor: ServiceFlavor): string => {
  const serviceName = toServiceName(service, flavor)

  const sections = [
    kdoc([
      'Returns a view of this service that provides access to raw HTTP responses for each method.'
    ]) + '\nfun withRawResponse(): WithRawResponse',
    kdoc([
      'Returns a view of this service with the given option modifications applied.',
      '',
      'The original service is not modified.'
    ]) + `\nfun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${serviceName}`,
    ...service.operations.flatMap(operation =>
      renderInterfaceMethods({ operation, flavor, raw: false, serviceName })
    ),
    renderRawView(service, flavor)
  ]

  return `\n${sections.join('\n\n')}`
}

const renderRawView = (service: SdkService, flavor: ServiceFlavor): string => {
  const serviceName = toServiceName(service, flavor)

  const members = [
    kdoc([
      'Returns a view of this service with the given option modifications applied.',
      '',
      'The original service is not modified.'
    ]) + `\nfun withOptions(modifier: (ClientOptions.Builder) -> Unit): ${serviceName}.WithRawResponse`,
    ...service.operations.flatMap(operation =>
      renderInterfaceMethods({ operation, flavor, raw: true, serviceName })
    )
  ]

  return (
    kdoc([
      `A view of [${serviceName}] that provides access to raw HTTP responses for each method.`
    ]) +
    `\ninterface WithRawResponse {\n\n${indent(members.join('\n\n'), 1)}\n}`
  )
}

type RenderMethodsArgs = {
  operation: SdkServiceOperation
  flavor: ServiceFlavor
  raw: boolean
  serviceName: string
}

const renderInterfaceMethods = ({
  operation,
  flavor,
  raw,
  serviceName
}: RenderMethodsArgs): string[] => {
  const { methodName, paramsClassName, pathParam, hasNone } = operation
  const returnType = raw
    ? `HttpResponseFor<${operation.responseClassName}>`
    : operation.responseClassName
  const annotation = raw ? '@MustBeClosed\n' : ''
  const declaration = fn(flavor)

  const headKdoc = raw
    ? kdoc([
        `Returns a raw HTTP response for \`${operation.httpVerb.toLowerCase()} ${operation.path}\`, but is otherwise the same as [${serviceName}.${methodName}].`
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

/** Imports for a service interface file. */
export const toServiceImports = (
  service: SdkService,
  basePackage: string
): Record<string, string[]> => {
  const imports: Record<string, string[]> = {
    'com.google.errorprone.annotations': ['MustBeClosed'],
    [`${basePackage}.core`]: ['ClientOptions', 'RequestOptions'],
    [`${basePackage}.core.http`]: ['HttpResponseFor']
  }

  addModelImports(service, basePackage, imports)

  return imports
}

export const addModelImports = (
  service: SdkService,
  basePackage: string,
  imports: Record<string, string[]>
): void => {
  for (const operation of service.operations) {
    const resourceModule = `${basePackage}.${operation.modelsSubpackage}`
    const names = (imports[resourceModule] ??= [])

    if (!names.includes(operation.paramsClassName)) {
      names.push(operation.paramsClassName)
    }

    if (operation.responseIsEnvelope) {
      const rootNames = (imports[`${basePackage}.models`] ??= [])

      if (!rootNames.includes(operation.responseClassName)) {
        rootNames.push(operation.responseClassName)
      }
    } else if (!names.includes(operation.responseClassName)) {
      names.push(operation.responseClassName)
    }

    names.sort()
  }
}
