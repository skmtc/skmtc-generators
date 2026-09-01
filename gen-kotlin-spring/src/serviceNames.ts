import type { GenerateContextType } from '@skmtc/core'
import { toApiTag, toServiceName } from './apiFile.ts'

/**
 * Every `<Tag>Service` name the document produces, memoized per document.
 *
 * Build order is arbitrary under memoization, so a scaffold cannot ask
 * whether some other tag's interface has already claimed its name — the scan
 * answers from the document instead, giving the same answer whatever the
 * order.
 */
const serviceNameCache = new WeakMap<object, Set<string>>()

const toServiceNames = (context: GenerateContextType): Set<string> => {
  const { document } = context

  const cached = serviceNameCache.get(document.value)

  if (cached) {
    return cached
  }

  const names = new Set<string>()

  if (document.type === 'oas') {
    for (const operation of document.value.operations) {
      names.add(toServiceName(toApiTag(operation.tags)))
    }
  }

  serviceNameCache.set(document.value, names)

  return names
}

type AssertImplementationNameFreeArgs = {
  context: GenerateContextType
  implementationName: string
  tag: string
}

/**
 * Kotlin's redeclaration scope is the PACKAGE, and the scaffold shares one
 * with every tag interface. `Default` + tag base can therefore land on a
 * name a tag already owns — a document tagging some operations `users` and
 * others `default users` gives `interface DefaultUsersService` and
 * `class DefaultUsersService` in the same package.
 *
 * Throwing fails that one subject rather than emitting a file that cannot
 * compile, matching how gen-kotlin-jackson's `claimSynthesizedName` guards
 * the same hazard for synthesized names.
 */
export const assertImplementationNameFree = (
  { context, implementationName, tag }: AssertImplementationNameFreeArgs
): void => {
  if (toServiceNames(context).has(implementationName)) {
    throw new Error(
      `gen-kotlin-spring: the scaffold for tag '${tag}' would be named ` +
        `'${implementationName}', which is already the service interface of ` +
        'another tag in the same package. Rename the tag, or set ' +
        'emitServiceImplementations to false.'
    )
  }
}
