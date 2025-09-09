import { ContentBase, type TypeSystemValue, type GenerateContext, type Modifiers, type GeneratorKey, type RefName } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toArktypeValue } from './Arktype.ts'

type ArktypeArrayArgs = {
  context: GenerateContext
  modifiers: Modifiers
  items: any
  destinationPath: string
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ArktypeArray extends ContentBase {
  type = 'array' as const
  items: TypeSystemValue
  modifiers: Modifiers
  
  constructor({ context, items, modifiers, destinationPath, generatorKey, rootRef }: ArktypeArrayArgs) {
    super({ context, generatorKey })
    
    this.modifiers = modifiers
    context.register({ imports: { arktype: ['type'] }, destinationPath })

    this.items = toArktypeValue({
      schema: items,
      required: true,
      destinationPath,
      context,
      rootRef
    })
  }

  override toString(): string {
    // For objects in arrays, use the string literal version (no quoted primitives)
    let innerType: string
    if (this.items.type === 'object' && 'toStringLiteral' in this.items) {
      innerType = (this.items as any).toStringLiteral()
    } else {
      const itemsStr = this.items.toString()
      
      // Extract the inner type from type("...") or type({...}) if present
      if (itemsStr.startsWith('type("') && itemsStr.endsWith('")')) {
        // Handle type("...") format
        innerType = itemsStr.slice(6, -2) // Remove type(" and ")
      } else if (itemsStr.startsWith('type(') && itemsStr.endsWith(')')) {
        // Handle type({...}) format (objects)
        innerType = itemsStr.slice(5, -1) // Remove type( and )
      } else {
        // Handle raw string format
        innerType = itemsStr
      }
    }

    // For complex union types in arrays, wrap in parentheses
    const needsParentheses = innerType.includes(' | ') && !innerType.startsWith('(')
    const finalInnerType = needsParentheses ? `(${innerType})` : innerType
    const arrayType = `${finalInnerType}[]`
    
    return applyModifiers(arrayType, this.modifiers)
  }
}