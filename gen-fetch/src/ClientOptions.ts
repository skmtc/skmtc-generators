import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'
import { match } from 'ts-pattern'
import type { AuthField } from './auth.ts'

type ClientOptionsArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  defaultBaseUrl: string | undefined
  authFields: AuthField[]
}

type OptionField = { name: string; type: string; optional: boolean; description: string }

/** The body of the `<Name>Options` type: base URL, fetch override and credentials. */
export class ClientOptions extends TsSnippet {
  fields: OptionField[]
  isRequired: boolean

  constructor({ context, generatorKey, defaultBaseUrl, authFields }: ClientOptionsArgs) {
    super({ context, generatorKey })

    const baseUrl: OptionField = defaultBaseUrl
      ? { name: 'baseUrl', type: 'string', optional: true, description: `Defaults to ${defaultBaseUrl}` }
      : { name: 'baseUrl', type: 'string', optional: false, description: 'The document declares no absolute server URL' }

    const fetchField: OptionField = {
      name: 'fetch',
      type: 'typeof fetch',
      optional: true,
      description: 'Defaults to the global fetch'
    }

    const credentialFields = authFields.flatMap((field): OptionField[] =>
      match(field)
        .with({ type: 'apiKey' }, ({ option, location, name }) => [
          {
            name: option,
            type: 'string',
            optional: true,
            description: `API key, sent in ${location === 'query' ? 'query parameter' : location} ${name}`
          }
        ])
        .with({ type: 'bearer' }, ({ option }) => [
          { name: option, type: 'string', optional: true, description: 'Sent as `Authorization: Bearer <token>`' }
        ])
        .with({ type: 'httpScheme' }, ({ option, scheme }) => [
          { name: option, type: 'string', optional: true, description: `Sent as \`Authorization: ${scheme} <token>\`` }
        ])
        .with({ type: 'basic' }, ({ usernameOption, passwordOption }) => [
          { name: usernameOption, type: 'string', optional: true, description: 'HTTP basic auth user name' },
          { name: passwordOption, type: 'string', optional: true, description: 'HTTP basic auth password' }
        ])
        .exhaustive()
    )

    this.fields = [baseUrl, fetchField, ...credentialFields]
    this.isRequired = this.fields.some(({ optional }) => !optional)
  }

  override toString(): string {
    const lines = this.fields.map(
      ({ name, type, optional, description }) => `  /** ${description} */\n  ${name}${optional ? '?' : ''}: ${type}`
    )

    return `{\n${lines.join('\n')}\n}`
  }
}
