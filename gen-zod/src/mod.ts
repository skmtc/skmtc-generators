import { toModelEntry } from "@skmtc/core";
import { typescript } from "@skmtc/lang-typescript";
import { ZodProjection } from "./ZodProjection.ts";
import denoJson from "../deno.json" with { type: "json" };

export const zodEntry = toModelEntry({
  id: denoJson.name,
  lang: typescript,
  transform({ context, refName }) {
    context.insertModel(ZodProjection, refName);
  },
});
