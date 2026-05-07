import {
  SnippetBase,
  type GenerateContextType,
  type GeneratorKey,
} from "@skmtc/core";

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
