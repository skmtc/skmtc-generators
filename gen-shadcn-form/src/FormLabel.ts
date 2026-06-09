import type { GenerateContextType } from '@skmtc/core'
import { TypescriptSnippet } from '@skmtc/lang-typescript'

type FormLabelArgs = {
  context: GenerateContextType
  label: string | undefined
  destinationPath: string
}
export class FormLabel extends TypescriptSnippet {
  label: string | undefined
  destinationPath: string
  constructor({ context, label, destinationPath }: FormLabelArgs) {
    super({ context })

    this.label = label
    this.destinationPath = destinationPath

    if (this.label) {
      this.register({
        imports: {
          '@/components/ui/form': ['FormLabel']
        },
        destinationPath
      })
    }
  }

  override toString() {
    return this.label ? `<FormLabel>${this.label}</FormLabel>` : ''
  }
}
