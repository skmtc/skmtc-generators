import { TsSnippet } from '@skmtc/lang-typescript'
import type { GenerateContextType, GeneratorKey } from '@skmtc/core'
import { match } from 'ts-pattern'

/**
 * How the success response is read. `zod` parses JSON with the schema from
 * gen-zod; `json` is JSON the document gives no schema for.
 */
export type ResponseForm =
  | { type: 'zod'; schemaName: string; mediaType: string }
  | { type: 'json'; mediaType: string }
  | { type: 'text'; mediaType: string }
  | { type: 'blob'; mediaType: string }
  | { type: 'void' }

type ResponseReadArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey | undefined
  form: ResponseForm
}

export class ResponseRead extends TsSnippet {
  form: ResponseForm
  accept: string | undefined

  constructor({ context, generatorKey, form }: ResponseReadArgs) {
    super({ context, generatorKey })

    this.form = form
    this.accept = 'mediaType' in form ? form.mediaType : undefined
  }

  override toString(): string {
    return match(this.form)
      .with({ type: 'zod' }, ({ schemaName }) => `return ${schemaName}.parse(await res.json())`)
      .with({ type: 'json' }, () => `const data: unknown = await res.json()\n\n  return data`)
      .with({ type: 'text' }, () => `return res.text()`)
      .with({ type: 'blob' }, () => `return res.blob()`)
      .with({ type: 'void' }, () => `return undefined`)
      .exhaustive()
  }
}
