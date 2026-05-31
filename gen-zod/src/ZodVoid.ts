import {
  SnippetBase,
  type GenerateContextType,
  type GeneratorKey,
} from "@skmtc/core";

// Note: `OasVoid` is not part of the `OasSchema` union, so it can't flow
// through `SnippetBase.schema`. A void snippet inherits its ancestor /
// key-derived pointer — there's no schema-value location to capture.
type ConstructorArgs = {
  context: GenerateContextType;
  generatorKey: GeneratorKey;
  destinationPath: string;
};

export class ZodVoid extends SnippetBase {
  type = "void" as const;

  constructor({ context, generatorKey, destinationPath }: ConstructorArgs) {
    super({ context, generatorKey });

    context.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    return `z.void()`;
  }
}
