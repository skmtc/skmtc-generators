import type { GenerateContextType, Method, OasOperation } from '@skmtc/core'
import { List, toPathTemplate, TsSnippet } from '@skmtc/lang-typescript'
import { BodyStep } from './BodyStep.ts'
import { HeadersStep } from './HeadersStep.ts'
import { UrlParamsStep } from './UrlParamsStep.ts'

type EffectRequestArgs = {
  context: GenerateContextType
  operation: OasOperation
  destinationPath: string
  /** Whether the function takes `params` at all — what the path is interpolated from. */
  hasParams: boolean
  /** The body's Effect schema, or `null` when the operation takes none. */
  bodyName: string | null
}

/**
 * `const request = HttpClientRequest.<method>(<url>).pipe(<steps>);` — the
 * request, built from `params` and `body`. Query and header steps are
 * present only when the operation declares them; a body step is what
 * turns the build into an Effect, so only then is it `yield*`ed.
 */
export class EffectRequest extends TsSnippet {
  method: Method
  /** A template literal over `params` when the path has parameters, a string literal otherwise. */
  url: string
  steps: List<(UrlParamsStep | HeadersStep | BodyStep)[], ',\n      ', 'none'>
  yields: boolean

  constructor(
    { context, operation, destinationPath, hasParams, bodyName }:
      EffectRequestArgs,
  ) {
    super({ context })

    const { method, path } = operation

    this.method = method
    this.url = hasParams
      ? `\`${toPathTemplate(path, 'params')}\``
      : JSON.stringify(path)

    const query = operation.toParams(['query']).map((param) => param.name)
    const headers = operation.toParams(['header']).map((param) => param.name)

    this.steps = new List(
      [
        query.length === 0
          ? undefined
          : new UrlParamsStep({ context, names: query }),
        headers.length === 0
          ? undefined
          : new HeadersStep({ context, names: headers }),
        bodyName === null
          ? undefined
          : new BodyStep({ context, schemaName: bodyName }),
      ],
      { separator: ',\n      ', bookends: 'none', skipEmpty: true },
    )

    this.yields = bodyName !== null

    this.register({
      imports: { 'effect/unstable/http': ['HttpClientRequest'] },
      destinationPath,
    })
  }

  override toString(): string {
    const built = `HttpClientRequest.${this.method}(${this.url})`

    const piped = this.steps.values.length === 0
      ? built
      : `${built}.pipe(\n      ${this.steps},\n    )`

    return this.yields
      ? `const request = yield* ${piped};`
      : `const request = ${piped};`
  }
}
