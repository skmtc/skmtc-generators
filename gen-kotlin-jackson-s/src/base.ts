import { capitalize, camelCase } from '@skmtc/core'

/** PascalCase model name from a schema refName. */
export const toJacksonSModelName = (refName: string): string => {
  return capitalize(camelCase(refName))
}

/**
 * The model's export path: the segments after `@/` ARE the package
 * directories (`KtFile` derives the `package` directive from them), so a
 * model lands at `@/<basePackage dirs>/models/<Name>.kt`.
 */
export const toJacksonSModelExportPath = (name: string, basePackage: string): string => {
  return `@/${basePackage.split('.').join('/')}/models/${name}.kt`
}
