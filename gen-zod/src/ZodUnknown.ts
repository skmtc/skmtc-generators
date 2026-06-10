import {
  type GenerateContextType,
  type GeneratorKey,
  type OasRef,
  type OasSchema,
} from "@skmtc/core";
import { TsSnippet } from "@skmtc/lang-typescript";

type ConstructorArgs = {
  context: GenerateContextType;
  destinationPath: string;
  generatorKey: GeneratorKey;
  /**
   * The originating schema node — for fine-grained attribution. Optional:
   * `ZodUnknown` is also built internally (e.g. a record's unknown value)
   * with no originating node, in which case the pointer is inherited.
   */
  schema?: OasSchema | OasRef<"schema">;
};

export class ZodUnknown extends TsSnippet {
  type = "unknown" as const;

  constructor({ context, destinationPath, generatorKey, schema }: ConstructorArgs) {
    super({ context, generatorKey, stackTrail: schema?.stackTrail.clone() });

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    return `z.unknown()`;
  }
}
