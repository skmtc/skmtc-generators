import {
  camelCase,
  ContentBase,
  Identifier,
  OasVoid,
  toMethodVerb,
  toPathTemplate
} from '@skmtc/core'
import type { GenerateContext, OasOperation, TypeSystemValue } from '@skmtc/core'
import { toTsValue } from '@skmtc/gen-typescript'

type SupabaseRouteArgs = {
  context: GenerateContext
  operation: OasOperation
  destinationPath: string
}

export class SupabaseRoute extends ContentBase {
  operation: OasOperation
  responseName: string
  serviceName: string

  constructor({ context, operation, destinationPath }: SupabaseRouteArgs) {
    super({ context })

    this.operation = operation

    this.serviceName = `${toMethodVerb(operation.method)}${camelCase(operation.path, {
      upperFirst: true
    })}Api`

    const responseSchema = operation.toSuccessResponse()?.resolve().toSchema()

    const value = toTsValue({
      context: this.context,
      schema: responseSchema ?? OasVoid.empty(),
      destinationPath,
      required: true,
      rootRef: responseSchema?.isRef() ? responseSchema.toRefName() : undefined
    })

    if (!responseSchema?.isRef()) {
      this.responseName = `${this.serviceName}Response`

      context.defineAndRegister({
        identifier: Identifier.createType(this.responseName),
        value,
        destinationPath
      }).value
    } else {
      this.responseName = responseSchema.toRefName()
    }
  }

  override toString(): string {
    const { method, path } = this.operation

    return `app.${method.toUpperCase()}('${toPathTemplate(path)}', async c => {
  console.log('${method} ${toPathTemplate(path)}')

  const res: ${this.responseName} = await ${this.serviceName}({
    req: c.req
  })()

  return c.json(res)
})`
  }
}
