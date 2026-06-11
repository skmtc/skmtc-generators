import type { GenerateContextType } from '@skmtc/core'
import { createClass, defineAndRegister, CsSnippet } from '@skmtc/lang-csharp'
import { join } from '@std/path'
import { getBaseNamespace } from './baseNamespace.ts'

/**
 * The generated error channel (CD4 — the Kotlin-G analog with a
 * DIFFERENT why): Spring needed a generated advice because the
 * Jackson-less kotlinx setup broke default error rendering; ASP.NET's
 * rendering works (STJ is native) — what is MISSING is a
 * status-bearing exception the seam can throw (no
 * `ResponseStatusException` equivalent exists). ServiceImpls throw
 * `new ApiException(404, "No such user")` — pure business logic, no
 * web layer.
 *
 * The body of `ApiException`: a C# 12 primary constructor carries the
 * message into `Exception` through the base clause (`CsBased` entries
 * are Stringable, so `Exception(message)` rides it); the status lands
 * in a get-only property. Complete output, no stubs.
 */
export class ApiExceptionValue extends CsSnippet {
  description =
    'A status-bearing error thrown by service implementations; ' +
    'ApiExceptionHandler renders it as a ProblemDetails response.'
  constructorParameters = 'int statusCode, string message'
  baseTypes = ['Exception(message)']

  constructor({
    context,
    destinationPath
  }: {
    context: GenerateContextType
    destinationPath: string
  }) {
    super({ context })

    this.register({
      imports: { 'System': ['Exception'] },
      destinationPath
    })
  }

  override toString(): string {
    return '    public int StatusCode { get; } = statusCode;'
  }
}

/**
 * The handler half: implements .NET 8+'s `IExceptionHandler`,
 * rendering the platform-native **ProblemDetails** wire shape
 * (RFC 9457). The consumer wires three documented lines:
 * `AddExceptionHandler<ApiExceptionHandler>()`, `AddProblemDetails()`,
 * `app.UseExceptionHandler()`. Block bodies live in hand-shaped
 * snippet values (the `GeneratedResults` precedent).
 */
export class ApiExceptionHandlerValue extends CsSnippet {
  description = 'Maps ApiException thrown by service implementations to ProblemDetails bodies.'
  baseTypes = ['IExceptionHandler']

  constructor({
    context,
    destinationPath
  }: {
    context: GenerateContextType
    destinationPath: string
  }) {
    super({ context })

    this.register({
      imports: {
        'Microsoft.AspNetCore.Diagnostics': ['IExceptionHandler'],
        'Microsoft.AspNetCore.Http': ['HttpContext'],
        'Microsoft.AspNetCore.Mvc': ['ProblemDetails'],
        'System': ['Exception'],
        'System.Threading': ['CancellationToken'],
        'System.Threading.Tasks': ['ValueTask']
      },
      destinationPath
    })
  }

  override toString(): string {
    return [
      '    public async ValueTask<bool> TryHandleAsync(',
      '        HttpContext httpContext,',
      '        Exception exception,',
      '        CancellationToken cancellationToken)',
      '    {',
      '        if (exception is not ApiException apiException)',
      '        {',
      '            return false;',
      '        }',
      '',
      '        httpContext.Response.StatusCode = apiException.StatusCode;',
      '        httpContext.Response.ContentType = "application/problem+json";',
      '        await httpContext.Response.WriteAsJsonAsync(',
      '            new ProblemDetails',
      '            {',
      '                Status = apiException.StatusCode,',
      '                Detail = apiException.Message',
      '            },',
      '            cancellationToken);',
      '        return true;',
      '    }'
    ].join('\n')
  }
}

const toErrorExportPath = (fileName: string): string => {
  return join('@', ...getBaseNamespace().split('.'), `${fileName}.generated.cs`)
}

/**
 * Ensure the error-channel pair exists — `findDefinition` +
 * `defineAndRegister`, wrong-type hits throw (note-30 lesson 4).
 * Called from every transform (idempotent; the Kotlin
 * `ensureApiErrorSupport` precedent), so every aspnet run carries the
 * channel.
 */
export const ensureApiErrorSupport = (context: GenerateContextType): void => {
  const targets = [
    { name: 'ApiException', Value: ApiExceptionValue },
    { name: 'ApiExceptionHandler', Value: ApiExceptionHandlerValue }
  ]

  for (const { name, Value } of targets) {
    const exportPath = toErrorExportPath(name)
    const existing = context.findDefinition({ name, exportPath })

    if (existing && !(existing.value instanceof Value)) {
      throw new Error(
        `@skmtc/gen-csharp-aspnet: found a definition named '${name}' at '${exportPath}' ` +
          `that is not the generated error channel — name collision, or two copies of the ` +
          `generator module are loaded`
      )
    }

    if (!existing) {
      defineAndRegister(context, {
        identifier: createClass(name),
        value: new Value({ context, destinationPath: exportPath }),
        destinationPath: exportPath
      })
    }
  }
}
