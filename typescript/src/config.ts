import { toModelConfig } from '@skmtc/core'
import { TsInsertable } from "./TsInsertable.ts";

export const typescriptConfig = toModelConfig({
  id: '@skmtc/typescript',
  transform({ context, refName }) {
    context.insertModel({insertable: TsInsertable, refName })
  }
})
