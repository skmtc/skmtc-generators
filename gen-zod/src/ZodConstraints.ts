import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type ZodConstraintArgs = {
  context: GenerateContextType;
  name: string;
  value: number | undefined;
};

export class ZodConstraint extends SnippetBase {
  name: string;
  value: number | undefined;
  constructor({ context, name, value }: ZodConstraintArgs) {
    super({ context });

    this.name = name;
    this.value = value;
  }

  override toString(): string {
    return typeof this.value === "undefined"
      ? ""
      : `.${this.name}(${this.value})`;
  }
}
