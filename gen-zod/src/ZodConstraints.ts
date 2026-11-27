import { SnippetBase, type GenerateContextType } from '@skmtc/core'

type ZodConstraintArgs = {
  context: GenerateContextType;
  name: string;
  /** A number, or code such as a regex literal. */
  value: number | string | undefined;
};

export class ZodConstraint extends SnippetBase {
  name: string;
  value: number | string | undefined;
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
