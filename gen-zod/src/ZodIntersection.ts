import { TsSnippet } from "@skmtc/lang-typescript";
import type { GenerateContextType, GeneratorKey, OasIntersection, TypeSystemValue } from '@skmtc/core'
import { toZodValue } from "./Zod.ts";
import { applyModifiers, type ZodModifiers } from "./applyModifiers.ts";
import { isCyclic, isDeferred } from "./deferred.ts";

type ZodIntersectionArgs = {
  context: GenerateContextType;
  destinationPath: string;
  schema: OasIntersection;
  /** The members to render: the router leaves out those that constrain nothing. Defaults to `schema.members`. */
  members?: OasIntersection["members"];
  modifiers: ZodModifiers;
  generatorKey: GeneratorKey;
};

export class ZodIntersection extends TsSnippet {
  type = "intersection" as const;
  members: TypeSystemValue[];
  modifiers: ZodModifiers;
  /** See `isDeferred`. */
  deferred: boolean;
  /** See `isCyclic`. */
  cyclic: boolean;

  constructor({
    context,
    generatorKey,
    destinationPath,
    members,
    modifiers,
    schema,
  }: ZodIntersectionArgs) {
    super({ context, generatorKey, stackTrail: schema.stackTrail.clone() });

    this.members = (members ?? schema.members).map((member) => {
      return toZodValue({
        destinationPath,
        schema: member,
        required: true,
        context,
      });
    });

    this.modifiers = modifiers;
    this.deferred = this.members.some(isDeferred);
    this.cyclic = this.members.some(isCyclic);

    this.register({ imports: { zod: ["z"] }, destinationPath });
  }

  override toString(): string {
    // No member at all allows any value.
    const [first = "z.unknown()", ...rest] = this.members;
    const members = rest.reduce<string>((left, right) => `${left}.and(${right})`, `${first}`);

    return applyModifiers(members, this.modifiers, this.cyclic);
  }
}
