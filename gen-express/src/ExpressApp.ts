import type { OperationInsertableArgs, ListArray, OasOperation, ListLines } from '@skmtc/core'
import { List } from '@skmtc/core'
import { ExpressAppBase } from './base.ts'
import { ExpressRoute } from './ExpressRoute.ts'

export class ExpressApp extends ExpressAppBase {
  methods: ListArray<string>
  routes: ListLines<ExpressRoute>

  constructor({ context, operation, settings }: OperationInsertableArgs) {
    super({ context, operation, settings })

    this.methods = List.toArray([])
    this.routes = List.toLines([])

    // Register imports needed across all routes
    this.register({
      imports: {
        express: ['Router', 'Request', 'Response', 'NextFunction']
      }
    })
  }

  append(operation: OasOperation) {
    const method = `'${operation.method.toUpperCase()}'`

    if (!this.methods.values.includes(method)) {
      this.methods.values.push(method)
    }

    this.routes.values.push(
      new ExpressRoute({
        context: this.context,
        operation,
        destinationPath: this.settings.exportPath
      })
    )
  }

  override toString(): string {
    return `Router()

${this.routes}
`
  }
}
