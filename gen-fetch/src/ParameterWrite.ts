import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey, OasParameter } from '@skmtc/core'
import { match } from 'ts-pattern'
import { ArgAccess } from './ArgAccess.ts'

type ParameterWriteArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  parameter: OasParameter
}

type ValueForm = 'scalar' | 'exploded-array' | 'joined-array' | 'json'

/**
 * One statement that copies a query, header or cookie parameter from `args`
 * into the request, skipping it when the caller left it out.
 */
export class ParameterWrite extends TsSnippet {
  name: string
  location: 'query' | 'header' | 'cookie'
  valueForm: ValueForm
  value: ArgAccess

  constructor({ context, generatorKey, parameter }: ParameterWriteArgs) {
    super({ context, generatorKey })

    this.name = parameter.name
    this.location = parameter.location === 'query' || parameter.location === 'header' ? parameter.location : 'cookie'
    this.value = new ArgAccess({ context, generatorKey, name: parameter.name })

    const schemaType = parameter.toSchema().resolve().type

    this.valueForm = match(schemaType)
      .with('array', () => {
        // OpenAPI's default for query parameters is `form` style, exploded.
        const exploded = parameter.explode ?? (parameter.style === undefined || parameter.style === 'form')

        return this.location === 'query' && exploded ? 'exploded-array' : 'joined-array'
      })
      .with('object', () => 'json' as const)
      .otherwise(() => 'scalar' as const)
  }

  override toString(): string {
    const name = JSON.stringify(this.name)

    const target = match(this.location)
      .with('query', () => 'query.append')
      .with('header', () => 'headers.set')
      .with('cookie', () => 'cookies.push')
      .exhaustive()

    const write = (valueExpression: string): string =>
      this.location === 'cookie'
        ? `${target}(${JSON.stringify(`${this.name}=`)} + encodeURIComponent(${valueExpression}))`
        : `${target}(${name}, ${valueExpression})`

    return match(this.valueForm)
      .with('exploded-array', () => `for (const item of ${this.value} ?? []) ${write('String(item)')}`)
      .with('joined-array', () => `if (${this.value} != null) ${write(`${this.value}.join(',')`)}`)
      .with('json', () => `if (${this.value} != null) ${write(`JSON.stringify(${this.value})`)}`)
      .with('scalar', () => `if (${this.value} != null) ${write(`String(${this.value})`)}`)
      .exhaustive()
  }
}
