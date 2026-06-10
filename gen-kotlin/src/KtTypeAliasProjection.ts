import { capitalize, camelCase } from '@skmtc/core'
import type { ModelProjectionConstructorArgs, SchemaToValueFn, TypeSystemValue } from '@skmtc/core'
import { createTypeAlias } from '@skmtc/lang-kotlin'
import { KtTypeAliasBase } from './base.ts'
import { toKtValue } from './Kt.ts'

/**
 * Every `components.schemas` entry that is neither an object-with-
 * properties nor a string enum → `typealias Name = <type expression>`
 * (primitives, arrays, maps, empty objects, unions-as-`JsonElement`,
 * refs-to-refs). Gives gen-kotlin the same full-refName coverage as
 * gen-typescript.
 */
export class KtTypeAliasProjection extends KtTypeAliasBase {
  value: TypeSystemValue

  constructor({ context, refName, settings, rootRef }: ModelProjectionConstructorArgs) {
    super({ context, refName, settings })

    const schema = context.resolveSchemaRefOnce(refName, KtTypeAliasBase.id)

    this.value = toKtValue({
      schema,
      destinationPath: settings.exportPath,
      required: true,
      context,
      rootRef,
      fallbackName: settings.identifier.name
    })
  }

  static schemaToValueFn: SchemaToValueFn = ({ context, schema, destinationPath, required, rootRef }) => {
    return toKtValue({
      schema,
      destinationPath,
      required,
      context,
      rootRef,
      fallbackName: rootRef ? capitalize(camelCase(rootRef)) : 'Inline'
    })
  }

  static createIdentifier = createTypeAlias

  override toString(): string {
    return `${this.value}`
  }
}
