import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'
import { match } from 'ts-pattern'
import type { AuthField } from './auth.ts'

type AuthWriteArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  field: AuthField
}

/** One statement that adds a credential from `options` to the request, when the caller passed it. */
export class AuthWrite extends TsSnippet {
  field: AuthField

  constructor({ context, generatorKey, field }: AuthWriteArgs) {
    super({ context, generatorKey })

    this.field = field
  }

  override toString(): string {
    return match(this.field)
      .with({ type: 'apiKey' }, ({ option, location, name }) => {
        const value = `options.${option}`

        return match(location)
          .with('header', () => `if (${value} !== undefined) headers.set(${JSON.stringify(name)}, ${value})`)
          .with('query', () => `if (${value} !== undefined) query.set(${JSON.stringify(name)}, ${value})`)
          .with(
            'cookie',
            () => `if (${value} !== undefined) cookies.push(${JSON.stringify(`${name}=`)} + encodeURIComponent(${value}))`
          )
          .exhaustive()
      })
      .with(
        { type: 'bearer' },
        ({ option }) => `if (options.${option} !== undefined) headers.set('authorization', \`Bearer \${options.${option}}\`)`
      )
      .with(
        { type: 'httpScheme' },
        ({ option, scheme }) =>
          `if (options.${option} !== undefined) headers.set('authorization', \`${scheme} \${options.${option}}\`)`
      )
      .with({ type: 'basic' }, ({ usernameOption, passwordOption }) => {
        const username = `options.${usernameOption}`
        const password = `options.${passwordOption}`

        return `if (${username} !== undefined && ${password} !== undefined) headers.set('authorization', \`Basic \${btoa(\`\${${username}}:\${${password}}\`)}\`)`
      })
      .exhaustive()
  }
}
