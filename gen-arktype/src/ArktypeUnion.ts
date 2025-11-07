import { ContentBase, type TypeSystemValue, type GenerateContextType, type Modifiers, type GeneratorKey, type RefName } from '@skmtc/core'
import { applyModifiers } from './applyModifiers.ts'
import { toArktypeValue } from './Arktype.ts'

type ArktypeUnionArgs = {
  context: GenerateContextType
  members: any[]
  discriminator?: any
  modifiers: Modifiers
  destinationPath: string
  generatorKey: GeneratorKey
  rootRef?: RefName
}

export class ArktypeUnion extends ContentBase {
  type = 'union' as const
  members: TypeSystemValue[]
  discriminator: any
  modifiers: Modifiers
  
  constructor({ context, members, discriminator, modifiers, destinationPath, generatorKey, rootRef }: ArktypeUnionArgs) {
    super({ context, generatorKey })
    
    this.discriminator = discriminator
    this.modifiers = modifiers
    context.register({ imports: { arktype: ['type'] }, destinationPath })

    this.members = members.map(member => 
      toArktypeValue({
        schema: member,
        required: true,
        destinationPath,
        context,
        rootRef
      })
    )
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

  override toString(): string {
    const memberTypes = this.members.map(member => {
      // For objects in unions, use the string literal version (no quoted primitives)
      if (member.type === 'object' && 'toStringLiteral' in member) {
        return (member as any).toStringLiteral()
      } else {
        const memberStr = member.toString()
        return this.extractInnerType(memberStr)
      }
    })

    const unionType = memberTypes.join(' | ')
    return applyModifiers(unionType, this.modifiers)
  }
}