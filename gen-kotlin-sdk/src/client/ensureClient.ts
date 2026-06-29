import type { GenerateContextType } from '@skmtc/core'
import { createClass, createInterface, defineAndRegister } from '@skmtc/lang-kotlin'
import { toCoreModuleRoot } from '@/base.ts'
import { toSdkConfig } from '@/config.ts'
import { toClientModel } from '@/client/SdkClient.ts'
import { SdkClientImplValue } from '@/client/SdkClientImplValue.ts'
import { SdkClientValue } from '@/client/SdkClientValue.ts'

/**
 * The four client-file singletons (note 32 §E-5) — `findDefinition`-guarded,
 * built once per run. The values render themselves from the shared client
 * model ({@link toClientModel}).
 */
export const ensureClient = (context: GenerateContextType): void => {
  const config = toSdkConfig(context)
  const coreModuleRoot = toCoreModuleRoot(config)
  const clientName = `${config.clientPrefix}Client`
  const clientPath = `${coreModuleRoot}/client/${clientName}.kt`

  if (context.findDefinition({ name: clientName, exportPath: clientPath })) {
    return
  }

  const model = toClientModel(context, config)

  const flavors = [
    { flavor: 'blocking', name: clientName },
    { flavor: 'async', name: `${clientName}Async` }
  ] as const

  for (const { flavor, name } of flavors) {
    const interfacePath = `${coreModuleRoot}/client/${name}.kt`
    const implPath = `${coreModuleRoot}/client/${name}Impl.kt`

    defineAndRegister(context, {
      identifier: createInterface(name),
      value: new SdkClientValue({
        context,
        model,
        flavor,
        basePackage: config.basePackage,
        destinationPath: interfacePath,
        fileHeader: config.fileHeader
      }),
      destinationPath: interfacePath
    })

    defineAndRegister(context, {
      identifier: createClass(`${name}Impl`),
      value: new SdkClientImplValue({
        context,
        model,
        flavor,
        basePackage: config.basePackage,
        destinationPath: implPath,
        fileHeader: config.fileHeader
      }),
      destinationPath: implPath
    })
  }
}
