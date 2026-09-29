import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'
import { ArgAccess } from './ArgAccess.ts'

type RequestPathArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  path: string
}

type PathPart = { type: 'text'; text: string } | { type: 'parameter'; value: ArgAccess }

const escapeTemplateText = (text: string): string => text.replace(/[`\\]|\$\{/g, match => `\\${match}`)

/**
 * The operation's path as a template literal body, each `{name}` replaced by
 * the encoded value of `args.name`.
 */
export class RequestPath extends TsSnippet {
  parts: PathPart[]

  constructor({ context, generatorKey, path }: RequestPathArgs) {
    super({ context, generatorKey })

    this.parts = path
      .split(/(\{[^}]+\})/)
      .filter(segment => segment.length > 0)
      .map(segment => {
        const parameter = segment.match(/^\{([^}]+)\}$/)

        return parameter
          ? { type: 'parameter', value: new ArgAccess({ context, generatorKey, name: parameter[1] }) }
          : { type: 'text', text: segment }
      })
  }

  override toString(): string {
    return this.parts
      .map(part =>
        part.type === 'text'
          ? escapeTemplateText(part.text)
          : `\${encodeURIComponent(String(${part.value}))}`
      )
      .join('')
  }
}
