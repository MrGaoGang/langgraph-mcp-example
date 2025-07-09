import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const plan = zodToJsonSchema(
  z.object({
    steps: z
      .array(z.string())
      .describe("different steps to follow, should be in sorted order"),
  })
);
const planFunction = {
  name: "plan",
  description: "This tool is used to plan the steps to follow",
  parameters: plan,
};

export const planTool = {
  type: "function",
  function: planFunction,
};

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const plannerPrompt = ChatPromptTemplate.fromTemplate(
  `For the given objective, come up with a simple step by step plan. \
This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps. \
The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.

{objective}`
);

const model = new ChatOpenAI({
  modelName: "gpt-4-0125-preview",
}).withStructuredOutput(planFunction);

export const planner = plannerPrompt.pipe(model);
