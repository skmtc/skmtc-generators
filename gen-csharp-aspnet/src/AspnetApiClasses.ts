import type { GenerateContextType } from '@skmtc/core'
import { CsAttribute, CsSnippet } from '@skmtc/lang-csharp'
import type { CsMethodSignature } from '@skmtc/lang-csharp'

type AspnetServiceInterfaceArgs = {
  context: GenerateContextType
}

/**
 * The accumulated body of one `I<Tag>Service` interface — the seam the
 * consumer implements and registers in DI
 * (`builder.Services.AddScoped<IUsersService, UsersService>()`).
 * Abstract `Task`-returning signatures only, no attributes, no
 * ASP.NET imports.
 */
export class AspnetServiceInterface extends CsSnippet {
  methods: CsMethodSignature[] = []

  constructor({ context }: AspnetServiceInterfaceArgs) {
    super({ context })
  }

  add(method: CsMethodSignature): void {
    this.methods.push(method)
  }

  override toString(): string {
    return this.methods.map(method => `${method}`).join('\n\n')
  }
}

type AspnetControllerClassArgs = {
  context: GenerateContextType
  serviceName: string
  destinationPath: string
}

/**
 * The accumulated body of one `[ApiController] <Tag>Controller` — ALL
 * the web plumbing, complete expression-bodied delegation. Class-level
 * attributes ride `CsAttributed`; the injected service rides
 * `CsConstructed` (a C# 12 primary constructor); the
 * ` : ControllerBase` clause rides `CsBased`.
 */
export class AspnetControllerClass extends CsSnippet {
  attributes: CsAttribute[]
  constructorParameters: string
  baseTypes: string[]
  methods: CsMethodSignature[] = []

  constructor({ context, serviceName, destinationPath }: AspnetControllerClassArgs) {
    super({ context })

    this.attributes = [new CsAttribute('ApiController')]
    this.constructorParameters = `${serviceName} service`
    this.baseTypes = ['ControllerBase']

    this.register({
      imports: { 'Microsoft.AspNetCore.Mvc': ['ApiController', 'ControllerBase'] },
      destinationPath
    })
  }

  add(method: CsMethodSignature): void {
    this.methods.push(method)
  }

  override toString(): string {
    return this.methods.map(method => `${method}`).join('\n\n')
  }
}
