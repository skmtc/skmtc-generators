import type { GenerateContextType, OasRef, OasSchema } from '@skmtc/core'
import { camelCase, capitalize } from '@skmtc/core'
import { getModelConfig } from '@/modelConfig.ts'
import { toSingular } from '@/naming.ts'
import { toStructuralHash, type SharedHashes } from '@/model/structuralHash.ts'
import {
  KtDatetimeType,
  KtEnumType,
  KtListType,
  KtNestedClassType,
  KtScalarType,
  KtSharedRefType,
  type KtType
} from '@/model/types/KtTypes.ts'
import type { AddField } from '@/model/ModelField.ts'

type ToKtTypeArgs = {
  context: GenerateContextType
  schema: OasSchema | OasRef<'schema'>
  propertyName: string
  destinationPath: string
  sharedHashes: SharedHashes
  /** Enrichment field injections for the `data`-level nested class. */
  addFields?: AddField[]
}

/**
 * The type router (the `toZodValue` shape): resolve refs, classify
 * against the shared-model hashes, then one branch per schema shape
 * constructs one type producer. Never builds strings.
 */
export const toKtType = ({
  context,
  schema,
  propertyName,
  destinationPath,
  sharedHashes,
  addFields
}: ToKtTypeArgs): KtType => {
  const config = getModelConfig()
  const resolved = schema.isRef() ? schema.resolve() : schema

  const shared = sharedHashes.get(toStructuralHash(resolved))

  if (shared) {
    return new KtSharedRefType({ context, className: shared, destinationPath })
  }

  switch (resolved.type) {
    case 'object':
      return new KtNestedClassType({
        context,
        className: capitalize(camelCase(propertyName)),
        schema: resolved,
        destinationPath,
        sharedHashes,
        addFields
      })
    case 'array':
      return new KtListType({
        context,
        element: toKtType({
          context,
          schema: resolved.items,
          propertyName: toSingular(propertyName),
          destinationPath,
          sharedHashes
        })
      })
    case 'string': {
      if (resolved.format === 'date-time') {
        return new KtDatetimeType({ context, date: 'offset-date-time', destinationPath })
      }

      if (resolved.format === 'date') {
        return new KtDatetimeType({ context, date: 'local-date', destinationPath })
      }

      const specMembers = (resolved.enums ?? []).filter(
        (member): member is string => typeof member === 'string'
      )
      const members = specMembers.length
        ? specMembers
        : (config.fieldEnums?.[propertyName] ?? [])

      if (members.length) {
        return new KtEnumType({
          context,
          className: capitalize(camelCase(propertyName)),
          members,
          description: resolved.description,
          destinationPath
        })
      }

      return new KtScalarType({ context, kotlin: 'String' })
    }
    case 'integer':
      return new KtScalarType({
        context,
        kotlin: resolved.format === 'int32' ? 'Int' : 'Long'
      })
    case 'number':
      return new KtScalarType({
        context,
        kotlin: resolved.format === 'float' ? 'Float' : 'Double'
      })
    case 'boolean':
      return new KtScalarType({ context, kotlin: 'Boolean' })
    default:
      throw new Error(
        `@skmtc/gen-kotlin-sdk: unmapped schema type '${resolved.type}' at property '${propertyName}'`
      )
  }
}
