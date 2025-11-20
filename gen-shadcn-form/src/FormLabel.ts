import { ContentBase, type GenerateContextType } from '@skmtc/core'

type FormLabelArgs = {
  context: GenerateContextType
  label: string | undefined
  destinationPath: string
}
export class FormLabel extends ContentBase {
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
