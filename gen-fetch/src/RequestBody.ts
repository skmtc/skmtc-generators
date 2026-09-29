import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'
import { match } from 'ts-pattern'
import { ArgAccess } from './ArgAccess.ts'

/**
 * How `args.body` becomes the request body. `json` and `form` bodies are typed
 * from their schema; any other media type is passed through as `BodyInit`.
 */
export type BodyForm = { type: 'json' | 'form' | 'raw'; mediaType: string }

type RequestBodyArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  form: BodyForm
}

export class RequestBody extends TsSnippet {
  form: BodyForm
  value: ArgAccess
  /** Unset for `multipart/form-data`: fetch writes that header itself, with the boundary. */
  contentType: string | undefined

  constructor({ context, generatorKey, form }: RequestBodyArgs) {
    super({ context, generatorKey })

    this.form = form
    this.value = new ArgAccess({ context, generatorKey, name: 'body' })
    this.contentType = form.mediaType.toLowerCase().startsWith('multipart/form-data') ? undefined : form.mediaType
  }

  override toString(): string {
    return match(this.form.type)
      .with('json', () => `JSON.stringify(${this.value})`)
      .with(
        'form',
        () =>
          `new URLSearchParams(Object.entries(${this.value}).flatMap(([key, value]) => (value == null ? [] : [[key, String(value)]])))`
      )
      .with('raw', () => `${this.value}`)
      .exhaustive()
  }
}
