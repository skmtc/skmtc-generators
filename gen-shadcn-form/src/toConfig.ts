import type { OasSchema, OasRef } from '@skmtc/core'
import { match } from 'ts-pattern'
import * as v from 'valibot'

type ToConfigArgs = {
  schema: OasSchema | OasRef<'schema'>
  description: string | undefined
}

export const toConfig = ({ description, schema }: ToConfigArgs): InputConfig => {
  const inputConfig = descriptionToConfig(description)

  return matchOnInputConfig(inputConfig, schema)
}

const matchOnInputConfig = (
  inputConfig: InputConfig | null,
  schema: OasSchema | OasRef<'schema'>
) => {
  return match(inputConfig)
    .with({ inputType: 'text' }, ({ label, inputType, skip }) => {
      return {
        label,
        inputType,
        skip: Boolean(skip)
      }
    })
    .with({ inputType: 'textarea' }, ({ label, inputType, skip }) => {
      return {
        label,
        inputType,
        skip: Boolean(skip)
      }
    })
    .with({ inputType: 'select' }, ({ label, inputType, sourcePath, skip }) => {
      return {
        label,
        inputType,
        sourcePath,
        skip: Boolean(skip)
      }
    })
    .with({ inputType: 'generators-list' }, ({ label, inputType, skip }) => {
      return {
        label,
        inputType,
        skip: Boolean(skip)
      }
    })
    .otherwise(() => {
      return matchOnInputType({ schema, inputConfig })
    })
}

type MatchOnInputTypeArgs = {
  schema: OasSchema | OasRef<'schema'>
  inputConfig: InputConfig | null
}

const matchOnInputType = ({ schema, inputConfig }: MatchOnInputTypeArgs) => {
  return match(schema)
    .returnType<InputConfig>()
    .with({ type: 'object' }, () => {
      return {
        label: inputConfig?.label ?? 'UNKNOWN',
        inputType: 'text',
        skip: Boolean(false)
      }
    })
    .with({ type: 'string' }, (matched) => {
      if (matched.enums) {
        return {
          label: inputConfig?.label ?? 'UNKNOWN',
          inputType: 'select',
          sourcePath:
            inputConfig && 'sourcePath' in inputConfig ? inputConfig.sourcePath : undefined,
          skip: Boolean(false)
        }
      }
      return {
        label: inputConfig?.label ?? 'UNKNOWN',
        inputType: 'text',
        skip: Boolean(false)
      }
    })
    .with({ type: 'number' }, () => {
      return {
        label: inputConfig?.label ?? 'UNKNOWN',
        inputType: 'number',
        skip: Boolean(false)
      }
    })
    .with({ type: 'integer' }, () => {
      return {
        label: inputConfig?.label ?? 'UNKNOWN',
        inputType: 'integer',
        skip: Boolean(false)
      }
    })
    .otherwise(() => {
      return {
        label: inputConfig?.label ?? 'UNKNOWN',
        inputType: 'text',
        skip: Boolean(false)
      }
    })
}
type TextInputConfig = {
  label: string | undefined
  inputType: 'text'
  skip?: boolean
}

const textInputConfig = v.object({
  label: v.string(),
  inputType: v.literal('text'),
  skip: v.optional(v.boolean())
})

type TextareaInputConfig = {
  label: string | undefined
  inputType: 'textarea'
  skip?: boolean
}

const textareaInputConfig = v.object({
  label: v.string(),
  inputType: v.literal('textarea'),
  skip: v.optional(v.boolean())
})

type SelectInputConfig = {
  label: string | undefined
  inputType: 'select'
  sourcePath?: string | undefined
  skip?: boolean
}

const selectInputConfig = v.object({
  label: v.string(),
  inputType: v.literal('select'),
  sourcePath: v.optional(v.string()),
  skip: v.optional(v.boolean())
})

type GeneratorsListInputConfig = {
  label: string | undefined
  inputType: 'generators-list'
  skip?: boolean
}

const generatorsListInputConfig = v.object({
  label: v.string(),
  inputType: v.literal('generators-list'),
  sourcePath: v.optional(v.string()),
  skip: v.optional(v.boolean())
})

const inputConfig = v.union([
  textInputConfig,
  textareaInputConfig,
  selectInputConfig,
  generatorsListInputConfig
])

type ObjectInputConfig = {
  label: string | undefined
  inputType: 'object'
  skip?: boolean
}

type NumberInputConfig = {
  label: string | undefined
  inputType: 'number'
  skip?: boolean
}

type IntegerInputConfig = {
  label: string | undefined
  inputType: 'integer'
  skip?: boolean
}

type InputConfig =
  | TextInputConfig
  | TextareaInputConfig
  | SelectInputConfig
  | GeneratorsListInputConfig
  | ObjectInputConfig
  | NumberInputConfig
  | IntegerInputConfig

export const descriptionToConfig = (description: string | undefined) => {
  if (!description) {
    return null
  }

  try {
    const parsed = JSON.parse(description)

    return v.parse(inputConfig, parsed)
  } catch (_error) {
    // console.error('Error parsing description', error)
    return null
  }
}
