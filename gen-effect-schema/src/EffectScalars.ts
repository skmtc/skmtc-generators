import { TsSnippet } from '@skmtc/lang-typescript'
import type {
  GenerateContextType,
  GeneratorKey,
  OasBoolean,
  OasInteger,
  OasNumber,
  OasRef,
  OasSchema,
} from '@skmtc/core'
import {
  applyModifiers,
  type EffectModifiers,
  libImports,
} from './modifiers.ts'
import { EffectCheck, EffectChecks } from './EffectChecks.ts'
import { LIB, LIB_MODULE } from './lib.ts'
import { toLiterals, withNullMember } from './literals.ts'

type ScalarArgs<Schema> = {
  context: GenerateContextType
  schema: Schema
  modifiers: EffectModifiers
  destinationPath: string
  generatorKey: GeneratorKey
  /** Query-string mode: decode from the string a URL carries. */
  coerce?: boolean
}

type NumericSchema = OasNumber | OasInteger

/**
 * `minimum` / `maximum` / `multipleOf` as Effect filters. Shared by the
 * number and integer leaves, which differ only in their base schema.
 */
const numericChecks = (
  context: GenerateContextType,
  schema: NumericSchema,
): EffectChecks => {
  const checks = new EffectChecks()

  if (schema.minimum !== undefined) {
    const name = schema.exclusiveMinimum
      ? 'isGreaterThan'
      : 'isGreaterThanOrEqualTo'
    checks.values.push(
      new EffectCheck({ context, name, value: schema.minimum }),
    )
  }

  if (schema.maximum !== undefined) {
    const name = schema.exclusiveMaximum ? 'isLessThan' : 'isLessThanOrEqualTo'
    checks.values.push(
      new EffectCheck({ context, name, value: schema.maximum }),
    )
  }

  if (schema.multipleOf !== undefined) {
    checks.values.push(
      new EffectCheck({
        context,
        name: 'isMultipleOf',
        value: schema.multipleOf,
      }),
    )
  }

  return checks
}

/**
 * What a numeric leaf imports from `effect`: the library, `Effect` for a
 * default, and `SchemaTransformation` for an enum narrowed under `coerce`
 * (see `toLiterals`).
 */
const numericImports = (
  modifiers: EffectModifiers,
  coerce: boolean,
  enums: readonly unknown[] | undefined,
): string[] =>
  coerce && enums?.length
    ? [...libImports(modifiers), 'SchemaTransformation']
    : libImports(modifiers)

export class EffectNumber extends TsSnippet {
  type = 'number' as const
  modifiers: EffectModifiers
  coerce: boolean
  enums: number[] | (number | null)[] | undefined
  checks: EffectChecks

  constructor(
    {
      context,
      schema,
      modifiers,
      destinationPath,
      generatorKey,
      coerce = false,
    }: ScalarArgs<OasNumber>,
  ) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers
    this.coerce = coerce
    this.enums = schema.enums
    this.checks = numericChecks(context, schema)

    this.register({
      imports: {
        [LIB_MODULE]: numericImports(modifiers, coerce, schema.enums),
      },
      destinationPath,
    })
  }

  override toString(): string {
    // Finite, not Number: a JSON number is finite by construction, and
    // `Schema.Number` admits NaN and the infinities — which the zod
    // schema of the same component refuses, as the agreement test found.
    const base = this.coerce ? `${LIB}.FiniteFromString` : `${LIB}.Finite`
    const content = this.enums?.length
      ? toLiterals(this.enums, this.coerce ? base : undefined)
      : `${base}${this.checks}`

    return applyModifiers(content, withNullMember(this.modifiers, this.enums))
  }
}

export class EffectInteger extends TsSnippet {
  type = 'integer' as const
  modifiers: EffectModifiers
  coerce: boolean
  format: 'int32' | 'int64' | undefined
  enums: number[] | (number | null)[] | undefined
  checks: EffectChecks

  constructor(
    {
      context,
      schema,
      modifiers,
      destinationPath,
      generatorKey,
      coerce = false,
    }: ScalarArgs<OasInteger>,
  ) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers
    this.coerce = coerce
    this.format = schema.format
    this.enums = schema.enums
    this.checks = numericChecks(context, schema)

    this.register({
      imports: {
        [LIB_MODULE]: numericImports(modifiers, coerce, schema.enums),
      },
      destinationPath,
    })
  }

  override toString(): string {
    // `Schema.Int` is `Schema.Number.check(Schema.isInt())`; further checks
    // append to it. From a string, the integer check is spelled out.
    const base = this.coerce
      ? `${LIB}.NumberFromString.check(${LIB}.isInt())`
      : `${LIB}.Int`
    const content = this.enums?.length
      ? toLiterals(this.enums, this.coerce ? base : undefined)
      : `${base}${this.checks}`

    return applyModifiers(content, withNullMember(this.modifiers, this.enums))
  }
}

/**
 * A boolean off a query string: only the two canonical spellings, so
 * `"false"` is false and anything else is refused — a JavaScript-style
 * coercion would read `"false"` as true.
 */
const BOOLEAN_FROM_STRING =
  `${LIB}.Literals(["true", "false"]).pipe(${LIB}.decodeTo(${LIB}.Boolean, SchemaTransformation.transform({ decode: (value) => value === "true", encode: (value) => (value ? "true" : "false") })))`

export class EffectBoolean extends TsSnippet {
  type = 'boolean' as const
  modifiers: EffectModifiers
  coerce: boolean
  enums: boolean[] | (boolean | null)[] | undefined

  constructor(
    {
      context,
      schema,
      modifiers,
      destinationPath,
      generatorKey,
      coerce = false,
    }: ScalarArgs<OasBoolean>,
  ) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() })

    this.modifiers = modifiers
    this.coerce = coerce
    this.enums = schema.enums

    this.register({
      imports: {
        [LIB_MODULE]: coerce
          ? [...libImports(modifiers), 'SchemaTransformation']
          : libImports(modifiers),
      },
      destinationPath,
    })
  }

  override toString(): string {
    // A one-member enum narrows to the literal, which is what keeps a
    // union discriminated on `true` / `false` narrow at the consumer.
    const base = this.coerce ? BOOLEAN_FROM_STRING : `${LIB}.Boolean`
    const content = this.enums?.length
      ? toLiterals(this.enums, this.coerce ? base : undefined)
      : base

    return applyModifiers(content, withNullMember(this.modifiers, this.enums))
  }
}

type EffectUnknownArgs = {
  context: GenerateContextType
  destinationPath: string
  generatorKey: GeneratorKey
  /**
   * The originating schema node — for fine-grained attribution.
   * Optional: also built internally (a record's untyped value) with no
   * originating node, in which case the pointer is inherited.
   */
  schema?: OasSchema | OasRef<'schema'>
}

export class EffectUnknown extends TsSnippet {
  type = 'unknown' as const

  constructor(
    { context, destinationPath, generatorKey, schema }: EffectUnknownArgs,
  ) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() })

    this.register({ imports: { [LIB_MODULE]: [LIB] }, destinationPath })
  }

  override toString(): string {
    return `${LIB}.Unknown`
  }
}

// `OasVoid` is not part of the `OasSchema` union, so it can't flow
// through `SnippetBase.schema` — a void snippet inherits its ancestor /
// key-derived pointer.
type EffectVoidArgs = {
  context: GenerateContextType
  generatorKey: GeneratorKey
  destinationPath: string
}

export class EffectVoid extends TsSnippet {
  type = 'void' as const

  constructor({ context, generatorKey, destinationPath }: EffectVoidArgs) {
    super({ context, generatorKey })

    this.register({ imports: { [LIB_MODULE]: [LIB] }, destinationPath })
  }

  override toString(): string {
    return `${LIB}.Void`
  }
}
