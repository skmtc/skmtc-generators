import { capitalize, camelCase } from '@skmtc/core'
import type { GenerateContextType, Method, OasOperation } from '@skmtc/core'
import {
  CsAttribute,
  CsMethodSignature,
  CsSnippet,
  sanitizePropertyName,
  type CsMethodParameterArgs
} from '@skmtc/lang-csharp'
import { toCsValue } from '@skmtc/gen-csharp'
import { ensureGeneratedResults } from './resultsSupport.ts'

type AspnetApiMethodArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
}

type MappingAttribute = {
  attribute: CsAttribute
  imports: string[]
}

/**
 * The ASP.NET mapping attribute for an HTTP method. The OAS path goes
 * in verbatim — `{id}` is already ASP.NET's route-template syntax (v1
 * carries no servers/base-path prefix); no class-level `[Route]`.
 */
const toMappingAttribute = (method: Method, path: string): MappingAttribute => {
  switch (method) {
    case 'get':
      return { attribute: new CsAttribute('HttpGet', [`"${path}"`]), imports: ['HttpGet'] }
    case 'post':
      return { attribute: new CsAttribute('HttpPost', [`"${path}"`]), imports: ['HttpPost'] }
    case 'put':
      return { attribute: new CsAttribute('HttpPut', [`"${path}"`]), imports: ['HttpPut'] }
    case 'patch':
      return { attribute: new CsAttribute('HttpPatch', [`"${path}"`]), imports: ['HttpPatch'] }
    case 'delete':
      return { attribute: new CsAttribute('HttpDelete', [`"${path}"`]), imports: ['HttpDelete'] }
    case 'head':
      return { attribute: new CsAttribute('HttpHead', [`"${path}"`]), imports: ['HttpHead'] }
    case 'options':
      return {
        attribute: new CsAttribute('HttpOptions', [`"${path}"`]),
        imports: ['HttpOptions']
      }
    case 'trace':
      // ASP.NET ships no [HttpTrace]; [AcceptVerbs] is the spelled-out form.
      return {
        attribute: new CsAttribute('AcceptVerbs', ['"TRACE"', `Route = "${path}"`]),
        imports: ['AcceptVerbs']
      }
    default: {
      const _exhaustive: never = method
      throw new Error(`Unhandled method: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

/**
 * One operation → the signature PAIR: the abstract `Task`-returning
 * service-seam method and the attributed, expression-bodied delegating
 * controller action. Both are built from ONE pass over the operation
 * against ONE destination file, so every type snippet (and any
 * inline-shape sibling it synthesizes) is created once and shared —
 * the note-25 amendment's invariant.
 *
 * The status map (the `@ResponseStatus` port, CC4):
 * - 200 + schema → `Task<T>` action, `await service.X(…)` (ASP.NET
 *   wraps 200).
 * - 200 / no schema → `Task` action.
 * - 201/202 + schema → `Task<ActionResult<T>>`,
 *   `StatusCode(<code>, await service.X(…))` + `[ProducesResponseType]`.
 * - 204 → `Task<IActionResult>`,
 *   `await GeneratedResults.NoContent(service.X(…))` (the generated
 *   sequencing helper — a 204 needs await-then-return, which the
 *   expression grammar cannot say inline).
 * - Other success codes (and bodyless 201/202) → the 200-style shape +
 *   `[ProducesResponseType(<code>)]` (documented limit).
 */
export class AspnetApiMethod extends CsSnippet {
  serviceSignature: CsMethodSignature
  controllerSignature: CsMethodSignature

  constructor({ context, operation, destinationPath }: AspnetApiMethodArgs) {
    super({ context })

    const methodName = capitalize(camelCase(`${operation.method}-${operation.path}`))
    const fallbackBase = methodName

    const mapping = toMappingAttribute(operation.method, operation.path)
    const mvcImports = new Set<string>(mapping.imports)

    type ParameterDescriptor = {
      name: string
      type: CsMethodParameterArgs['type']
      attribute: CsAttribute
      optional: boolean
    }

    const descriptors: ParameterDescriptor[] = []

    const addParameter = (
      name: string,
      type: CsMethodParameterArgs['type'],
      attribute: CsAttribute,
      optional = false
    ) => {
      descriptors.push({ name, type, attribute, optional })
    }

    /** C# parameter names are camelCase — force the leading character
     * down (`camelCase('X-Tenant')` keeps the capital). */
    const toParameterName = (wireName: string): string => {
      const base = camelCase(wireName)

      return sanitizePropertyName(base.charAt(0).toLowerCase() + base.slice(1))
    }

    for (const parameter of operation.toParams(['path'])) {
      mvcImports.add('FromRoute')

      addParameter(
        toParameterName(parameter.name),
        toCsValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: true,
          context,
          fallbackName: `${fallbackBase}${capitalize(camelCase(parameter.name))}`
        }),
        new CsAttribute('FromRoute', [`Name = "${parameter.name}"`])
      )
    }

    for (const parameter of operation.toParams(['query'])) {
      mvcImports.add('FromQuery')

      addParameter(
        toParameterName(parameter.name),
        toCsValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: parameter.required ?? false,
          context,
          fallbackName: `${fallbackBase}${capitalize(camelCase(parameter.name))}`
        }),
        new CsAttribute('FromQuery', [`Name = "${parameter.name}"`]),
        !(parameter.required ?? false)
      )
    }

    for (const parameter of operation.toParams(['header'])) {
      mvcImports.add('FromHeader')

      addParameter(
        toParameterName(parameter.name),
        toCsValue({
          schema: parameter.toSchema(),
          destinationPath,
          required: parameter.required ?? false,
          context,
          fallbackName: `${fallbackBase}${capitalize(camelCase(parameter.name))}`
        }),
        new CsAttribute('FromHeader', [`Name = "${parameter.name}"`]),
        !(parameter.required ?? false)
      )
    }

    const body = operation.toRequestBody(({ schema, requestBody }) => ({
      schema,
      required: requestBody.required
    }))

    if (body) {
      mvcImports.add('FromBody')

      addParameter(
        'body',
        toCsValue({
          schema: body.schema,
          destinationPath,
          required: body.required ?? false,
          context,
          fallbackName: `${fallbackBase}Body`
        }),
        new CsAttribute('FromBody'),
        !(body.required ?? false)
      )
    }

    // C# REQUIRES optional (defaulted) parameters to trail required
    // ones (CS1737) — Kotlin's named-args tolerance does not port.
    // Stable-partition required-first; ONE order drives the seam, the
    // controller binding, and the delegation arguments.
    const orderedDescriptors = [
      ...descriptors.filter(descriptor => !descriptor.optional),
      ...descriptors.filter(descriptor => descriptor.optional)
    ]

    const serviceParameters: CsMethodParameterArgs[] = orderedDescriptors.map(descriptor => ({
      name: descriptor.name,
      type: descriptor.type,
      defaultValue: descriptor.optional ? 'null' : undefined
    }))

    const controllerParameters: CsMethodParameterArgs[] = orderedDescriptors.map(descriptor => ({
      name: descriptor.name,
      type: descriptor.type,
      attributes: [descriptor.attribute]
    }))

    const successCode = operation.toSuccessResponseCode()
    const isNoContent = successCode === '204'

    const responseSchema = isNoContent
      ? undefined
      : operation.toSuccessResponse()?.resolve().toSchema()

    const responseValue = responseSchema
      ? toCsValue({
          schema: responseSchema,
          destinationPath,
          required: true,
          context,
          fallbackName: `${fallbackBase}Response`
        })
      : undefined

    const serviceReturnType = responseValue ? `Task<${responseValue}>` : 'Task'

    const controllerAttributes = [mapping.attribute]
    const argumentNames = serviceParameters.map(parameter => parameter.name)
    const delegationCall = `service.${methodName}(${argumentNames.join(', ')})`

    let controllerReturnType: string
    let expressionBody: string

    if (isNoContent) {
      const helperName = ensureGeneratedResults(context)

      mvcImports.add('IActionResult')
      mvcImports.add('ProducesResponseType')
      controllerAttributes.push(new CsAttribute('ProducesResponseType', ['204']))
      controllerReturnType = 'Task<IActionResult>'
      expressionBody = `await ${helperName}.NoContent(${delegationCall})`
    } else if ((successCode === '201' || successCode === '202') && responseValue) {
      mvcImports.add('ActionResult')
      mvcImports.add('ProducesResponseType')
      controllerAttributes.push(new CsAttribute('ProducesResponseType', [successCode]))
      controllerReturnType = `Task<ActionResult<${responseValue}>>`
      expressionBody = `StatusCode(${successCode}, await ${delegationCall})`
    } else {
      if (successCode && successCode !== '200') {
        mvcImports.add('ProducesResponseType')
        controllerAttributes.push(new CsAttribute('ProducesResponseType', [successCode]))
      }

      controllerReturnType = serviceReturnType
      expressionBody = `await ${delegationCall}`
    }

    this.register({
      imports: {
        'Microsoft.AspNetCore.Mvc': [...mvcImports].sort(),
        'System.Threading.Tasks': ['Task']
      },
      destinationPath
    })

    const description = operation.summary ?? operation.description

    this.serviceSignature = new CsMethodSignature({
      name: methodName,
      parameters: serviceParameters,
      returnType: serviceReturnType,
      description
    })

    this.controllerSignature = new CsMethodSignature({
      name: methodName,
      parameters: controllerParameters,
      returnType: controllerReturnType,
      attributes: controllerAttributes,
      modifiers: 'public async',
      expressionBody
    })
  }

  override toString(): string {
    return `${this.controllerSignature}`
  }
}
