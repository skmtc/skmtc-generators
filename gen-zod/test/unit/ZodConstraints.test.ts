import { assertEquals } from "@std/assert";
import { ZodConstraint } from "../../src/ZodConstraints.ts";
import { Maybe } from "../../src/Maybe.ts";
import { toGenerateContext } from "../helpers/toGenerateContext.ts";

Deno.test("ZodConstraint - with valid value", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "min",
    value: 5,
  });

  assertEquals(constraint.toString(), ".min(5)");
});

// An absent keyword never builds a ZodConstraint: the Maybe around it renders
// nothing and its build function does not run.
Deno.test("ZodConstraint - an absent value builds no constraint", () => {
  const context = toGenerateContext();
  const absent: number | undefined = [5, undefined][1];
  let built = 0;

  const constraint = new Maybe(absent, (value) => {
    built++;
    return new ZodConstraint({ context, name: "min", value });
  });

  assertEquals(constraint.toString(), "");
  assertEquals(built, 0);
});

Deno.test("ZodConstraint - with zero value", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "gte",
    value: 0,
  });

  assertEquals(constraint.toString(), ".gte(0)");
});

Deno.test("ZodConstraint - gt (greater than)", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "gt",
    value: 5,
  });

  assertEquals(constraint.toString(), ".gt(5)");
});

Deno.test("ZodConstraint - gte (greater than or equal)", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "gte",
    value: 5,
  });

  assertEquals(constraint.toString(), ".gte(5)");
});

Deno.test("ZodConstraint - lt (less than)", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "lt",
    value: 100,
  });

  assertEquals(constraint.toString(), ".lt(100)");
});

Deno.test("ZodConstraint - lte (less than or equal)", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "lte",
    value: 100,
  });

  assertEquals(constraint.toString(), ".lte(100)");
});

Deno.test("ZodConstraint - min (minimum)", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "min",
    value: 5,
  });

  assertEquals(constraint.toString(), ".min(5)");
});

Deno.test("ZodConstraint - max (maximum)", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "max",
    value: 100,
  });

  assertEquals(constraint.toString(), ".max(100)");
});

Deno.test("ZodConstraint - multipleOf", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "multipleOf",
    value: 10,
  });

  assertEquals(constraint.toString(), ".multipleOf(10)");
});

Deno.test("ZodConstraint - with decimal value", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "multipleOf",
    value: 0.5,
  });

  assertEquals(constraint.toString(), ".multipleOf(0.5)");
});

Deno.test("ZodConstraint - with negative value", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "gt",
    value: -10,
  });

  assertEquals(constraint.toString(), ".gt(-10)");
});

Deno.test("ZodConstraint - with large number", () => {
  const constraint = new ZodConstraint({
    context: toGenerateContext(),
    name: "lte",
    value: 999999,
  });

  assertEquals(constraint.toString(), ".lte(999999)");
});
