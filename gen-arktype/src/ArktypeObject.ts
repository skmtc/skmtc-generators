import { ContentBase, type TypeSystemValue, type GenerateContext, type Modifiers, type GeneratorKey, type OasObject, type RefName, type TypeSystemRecord, type TypeSystemObjectProperties, handleKey, isEmpty } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toArktypeValue } from './Arktype.ts'

type ArktypeObjectArgs = {
  context: GenerateContext
  objectSchema: OasObject
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ArktypeObject extends ContentBase {
  type = 'object' as const
  recordProperties: TypeSystemRecord | null
  objectProperties: TypeSystemObjectProperties | null
  modifiers: Modifiers
  private properties: Record<string, TypeSystemValue>
  private additionalProperties: TypeSystemValue | undefined
  private required: string[]
  private hasPropertiesAndAdditional: boolean
  
  constructor({ context, objectSchema, modifiers, destinationPath, generatorKey, rootRef }: ArktypeObjectArgs) {
    super({ context, generatorKey })
    
    this.modifiers = modifiers
    this.required = objectSchema.required || []
    context.register({ imports: { arktype: ['type'] }, destinationPath })

    // Handle properties
    this.properties = {}
    if (objectSchema.properties) {
      Object.entries(objectSchema.properties).forEach(([key, value]) => {
        // Always pass required: true for object properties
        // Optionality is handled at the object key level with the "?" syntax
        this.properties[key] = toArktypeValue({
          schema: value,
          required: true,
          destinationPath,
          context,
          rootRef
        })
      })
    }

    // Handle additionalProperties
    this.additionalProperties = undefined
    if (objectSchema.additionalProperties) {
      if (objectSchema.additionalProperties === true) {
        // additionalProperties: true means Record<string, unknown>
        // Create a proper unknown schema
        this.additionalProperties = {
          toString: () => 'type("unknown")'
        } as TypeSystemValue
      } else {
        this.additionalProperties = toArktypeValue({
          schema: objectSchema.additionalProperties,
          required: true,
          destinationPath,
          context,
          rootRef
        })
      }
    }

    this.hasPropertiesAndAdditional = Object.keys(this.properties).length > 0 && !!this.additionalProperties

    // Set required TypeSystemValue interface properties
    this.recordProperties = null
    this.objectProperties = null
  }

  private extractInnerType(str: string): string {
    if (str.startsWith('type("') && str.endsWith('")')) {
      // Handle type("...") format
      return str.slice(6, -2) // Remove type(" and ")
    } else if (str.startsWith('type(') && str.endsWith(')')) {
      // Handle type({...}) format (objects)
      return str.slice(5, -1) // Remove type( and )
    }
    // Handle raw string format
    return str
  }

  /** Get object literal for use in string contexts (no quoted primitives) */
  toStringLiteral(): string {
    return this.generateObjectString(false)
  }

  override toString(): string {
    return this.generateObjectString(true)
  }

  private generateObjectString(quotePrimitives: boolean): string {
    // Handle pure additionalProperties case
    if (Object.keys(this.properties).length === 0 && this.additionalProperties) {
      const additionalType = this.extractInnerType(this.additionalProperties.toString())
      const recordType = `Record<string, ${additionalType}>`
      return quotePrimitives ? applyModifiers(recordType, this.modifiers) : recordType
    }

    // Handle empty object
    if (Object.keys(this.properties).length === 0) {
      // For empty objects, return type({}) or {}
      if (quotePrimitives && this.modifiers.required && !this.modifiers.nullable) {
        return 'type({})'
      }
      return quotePrimitives ? applyModifiers('{}', this.modifiers) : '{}'
    }

    // Handle object with properties
    const props = Object.entries(this.properties).map(([key, value]) => {
      const isRequired = this.required.includes(key)
      const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
      const finalKey = isRequired ? keyStr : `"${key}?"`
      const valueStr = this.extractInnerType(value.toString())
      
      // Quote primitive types based on context, but not object literals
      // Special case: if the value is an array of objects, don't quote it
      const isObjectLiteral = valueStr.startsWith('{') && valueStr.endsWith('}')
      const isArrayOfObjects = valueStr.includes('}[]')
      const formattedValue = (quotePrimitives && !isObjectLiteral && !isArrayOfObjects) ? `"${valueStr}"` : valueStr
      
      return `${finalKey}: ${formattedValue}`
    }).join(', ')

    const objectType = `{ ${props} }`

    // Handle object with properties AND additionalProperties
    if (this.hasPropertiesAndAdditional) {
      const additionalType = this.extractInnerType(this.additionalProperties!.toString())
      const combinedType = `${objectType} & Record<string, ${additionalType}>`
      
      if (quotePrimitives) {
        // Get object properties without additionalProperties to avoid recursion
        const props = Object.entries(this.properties).map(([key, value]) => {
          const isRequired = this.required.includes(key)
          const keyStr = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
          const finalKey = isRequired ? keyStr : `"${key}?"`
          const valueStr = this.extractInnerType(value.toString())
          
          // Don't quote primitives in string literal format
          return `${finalKey}: ${valueStr}`
        }).join(', ')

        const stringLiteralObject = `{ ${props} }`
        const stringLiteralCombined = `${stringLiteralObject} & Record<string, ${additionalType}>`
        const parts = [stringLiteralCombined]

        if (this.modifiers.nullable) {
          parts.push('null')
        }

        if (!this.modifiers.required) {
          parts.push('undefined')
        }

        if (parts.length === 1) {
          return `type("${stringLiteralCombined}")`
        }

        return `type("${parts.join(' | ')}")`
      }
      
      return combinedType
    }

    // For basic objects
    if (quotePrimitives && this.modifiers.required && !this.modifiers.nullable) {
      return `type(${objectType})`
    }

    // For objects with modifiers, we need to handle the string literal case
    if (quotePrimitives) {
      // Use string literal format in modifier contexts (unions, nullable)
      const stringLiteralObject = this.generateObjectString(false)
      const parts = [stringLiteralObject]

      if (this.modifiers.nullable) {
        parts.push('null')
      }

      if (!this.modifiers.required) {
        parts.push('undefined')
      }

      if (parts.length === 1) {
        return `type("${stringLiteralObject}")`
      }

      return `type("${parts.join(' | ')}")`
    }

    return objectType
  }
}