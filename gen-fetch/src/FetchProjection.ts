import { capitalize, decapitalize } from '@skmtc/core'
import type { OasOperationProjectionConstructorArgs, OasObject } from '@skmtc/core'
import { createClass, createType, defineAndRegister } from '@skmtc/lang-typescript'
import { TsProjection } from '@skmtc/gen-typescript'
import { ZodProjection } from '@skmtc/gen-zod'
import { FetchBase } from './base.ts'
import type { EnrichmentSchema } from './enrichments.ts'
import { toAuth } from './auth.ts'
import { toDefaultBaseUrl } from './baseUrl.ts'
import { ApiError } from './ApiError.ts'
import { AuthWrite } from './AuthWrite.ts'
import { ClientOptions } from './ClientOptions.ts'
import { ParameterWrite } from './ParameterWrite.ts'
import { RequestBody, type BodyForm } from './RequestBody.ts'
import { RequestPath } from './RequestPath.ts'
import { ResponseRead, type ResponseForm } from './ResponseRead.ts'
import { toJsonMediaType } from './mediaTypes.ts'
import { toErrorClassName } from './toErrorClassName.ts'

/**
 * One `fetch` call for one operation: typed arguments from gen-typescript, a
 * response checked with gen-zod's schema, and an `ApiError` on a non-2xx.
 */
export class FetchProjection extends FetchBase {
  description: string
  argsName: string | undefined
  argsRequired: boolean
  optionsName: string
  optionsRequired: boolean
  defaultBaseUrl: string | undefined
  path: RequestPath
  parameterWrites: ParameterWrite[]
  authWrites: AuthWrite[]
  hasCookies: boolean
  body: RequestBody | undefined
  response: ResponseRead
  errorClassName: string

  constructor({ context, operation, settings }: OasOperationProjectionConstructorArgs<EnrichmentSchema>) {
    super({ context, operation, settings })

    const { generatorKey } = this
    const name = settings.identifier.name
    const exportPath = settings.exportPath
    const generatorSettings = settings.enrichments?.generator

    this.path = new RequestPath({ context, generatorKey, path: operation.path })

    const parameters = operation.toParams(['query', 'header', 'cookie'])

    this.parameterWrites = parameters.map(parameter => new ParameterWrite({ context, generatorKey, parameter }))
    this.hasCookies = parameters.some(({ location }) => location === 'cookie')

    // Arguments: every parameter, plus the body when its schema types it.
    const bodyForm = toBodyForm(operation.requestBody?.resolve().content ?? {})
    const parametersObject = operation.toParametersObject()
    const bodySchema =
      bodyForm && bodyForm.type !== 'raw'
        ? operation.toRequestBody(({ schema }) => schema, bodyForm.mediaType)
        : undefined

    const argsObject: OasObject = bodySchema
      ? parametersObject.addProperty({ name: 'body', schema: bodySchema, required: true })
      : parametersObject

    this.body = bodyForm ? new RequestBody({ context, generatorKey, form: bodyForm }) : undefined

    this.argsName = Object.keys(argsObject.properties ?? {}).length
      ? this.insertNormalizedModel(TsProjection, {
          schema: argsObject,
          fallbackName: `${capitalize(name)}Args`
        }).identifier.name
      : undefined

    this.argsRequired = Boolean(bodyForm) || operation.toParams().some(({ required }) => required)

    // Response: the lowest 2xx, parsed with gen-zod's schema when it is JSON.
    const successResponse = operation.toSuccessResponse()?.resolve()
    const responseMediaTypes = Object.keys(successResponse?.content ?? {})
    const jsonMediaType = toJsonMediaType(responseMediaTypes)
    const responseSchema = jsonMediaType ? successResponse?.toSchema(jsonMediaType) : undefined

    const responseForm: ResponseForm = jsonMediaType
      ? responseSchema
        ? {
            type: 'zod',
            mediaType: jsonMediaType,
            schemaName: this.insertNormalizedModel(ZodProjection, {
              schema: responseSchema,
              fallbackName: `${decapitalize(name)}Response`
            }).identifier.name
          }
        : { type: 'json', mediaType: jsonMediaType }
      : toNonJsonResponseForm(responseMediaTypes)

    this.response = new ResponseRead({ context, generatorKey, form: responseForm })

    // Options: base URL, fetch override and credentials.
    const auth = toAuth({ operation, context })

    this.authWrites = auth.fields.map(field => new AuthWrite({ context, generatorKey, field }))
    this.defaultBaseUrl = toDefaultBaseUrl({ operation, context, configured: generatorSettings?.baseUrl })

    const clientOptions = new ClientOptions({
      context,
      generatorKey,
      defaultBaseUrl: this.defaultBaseUrl,
      authFields: auth.fields
    })

    this.optionsName = `${capitalize(name)}Options`
    this.optionsRequired = clientOptions.isRequired

    defineAndRegister(context, {
      identifier: createType(this.optionsName),
      value: clientOptions,
      destinationPath: exportPath
    })

    // Shared by every operation written to the same file.
    this.errorClassName = toErrorClassName(context)

    if (!context.findDefinition({ name: this.errorClassName, exportPath })) {
      defineAndRegister(context, {
        identifier: createClass(this.errorClassName),
        value: new ApiError({ context, generatorKey, name: this.errorClassName }),
        destinationPath: exportPath
      })
    }

    const title = operation.summary ?? operation.description?.split('\n')[0]

    this.description = [
      title,
      `${operation.method.toUpperCase()} ${operation.path}`,
      generatorSettings?.docsUrl ? `Docs: ${generatorSettings.docsUrl}` : undefined,
      auth.alternatives.length ? `Also accepts auth: ${auth.alternatives.join(', ')}` : undefined
    ]
      .filter(line => line !== undefined && line.trim().length > 0)
      .join('\n\n')
  }

  override toString(): string {
    const argsParameter = this.argsName ? `args: ${this.argsName}${this.argsRequired ? '' : ' = {}'}` : undefined
    const rawBodyParameter =
      this.body?.form.type === 'raw' ? `args: ${this.argsName ? `${this.argsName} & ` : ''}{ body: BodyInit }` : undefined
    const optionsParameter = `options: ${this.optionsName}${this.optionsRequired ? '' : ' = {}'}`

    const parameterList = [rawBodyParameter ?? argsParameter, optionsParameter].filter(Boolean).join(', ')

    const baseUrlBinding = this.defaultBaseUrl ? `baseUrl = ${JSON.stringify(this.defaultBaseUrl)}` : 'baseUrl'

    const contentType = this.body?.contentType
    const accept = this.response.accept

    const blocks = [
      [
        `const { ${baseUrlBinding}, fetch: fetchFn = fetch } = options`,
        'const query = new URLSearchParams()',
        'const headers = new Headers()',
        this.hasCookies ? 'const cookies: string[] = []' : undefined
      ],
      [
        contentType ? `headers.set('content-type', ${JSON.stringify(contentType)})` : undefined,
        accept ? `headers.set('accept', ${JSON.stringify(accept)})` : undefined,
        ...this.parameterWrites.map(write => `${write}`),
        ...this.authWrites.map(write => `${write}`),
        this.hasCookies ? `if (cookies.length > 0) headers.set('cookie', cookies.join('; '))` : undefined
      ],
      [
        'const queryString = query.toString()',
        `const res = await fetchFn(\`\${baseUrl.replace(/\\/+$/, '')}${this.path}\${queryString ? \`?\${queryString}\` : ''}\`, {
    method: ${JSON.stringify(this.operation.method.toUpperCase())},
    headers${this.body ? `,\n    body: ${this.body}` : ''}
  })`
      ],
      [`if (!res.ok) throw new ${this.errorClassName}(res.status, await res.text())`],
      [`${this.response}`]
    ]
      .map(block => block.filter(statement => statement !== undefined))
      .filter(block => block.length > 0)
      .map(block => block.join('\n  '))

    return `async (${parameterList}) => {\n  ${blocks.join('\n\n  ')}\n}`
  }
}

/** JSON first, then a url-encoded form; anything else is sent as it is given. */
const toBodyForm = (content: Record<string, unknown>): BodyForm | undefined => {
  const mediaTypes = Object.keys(content)
  const jsonMediaType = toJsonMediaType(mediaTypes)

  if (jsonMediaType) {
    return { type: 'json', mediaType: jsonMediaType }
  }

  const formMediaType = mediaTypes.find(mediaType =>
    mediaType.toLowerCase().startsWith('application/x-www-form-urlencoded')
  )

  if (formMediaType) {
    return { type: 'form', mediaType: formMediaType }
  }

  const [first] = mediaTypes

  return first ? { type: 'raw', mediaType: first } : undefined
}

const toNonJsonResponseForm = (mediaTypes: string[]): ResponseForm => {
  const [first] = mediaTypes

  if (!first) {
    return { type: 'void' }
  }

  return first.toLowerCase().startsWith('text/') ? { type: 'text', mediaType: first } : { type: 'blob', mediaType: first }
}
