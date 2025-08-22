import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { planTool } from "./plan";

const response = zodToJsonSchema(
  z.object({
    response: z.string().describe("Response to user."),
  })
);

const responseTool = {
  type: "function",
  function: {
    name: "response",
    description: "Response to user.",
    parameters: response,
  },
};

const replannerPrompt = ChatPromptTemplate.fromTemplate(
  `
For the given objective, come up with a simple step by step plan. 
This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps.
The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.

Your current replan count is:
{replanCount}

Your objective was this:
{input}

Your original plan was this:
{plan}

You have currently done the follow steps:
{pastSteps}

Based on the  given objective, the original plan, and the currently done the follow steps, you must decide whether further optimization is needed. If so, update the corresponding plan. There are several situations where updating the plan is not permitted.
1. If no further steps are needed, you can return the result to the user by responding to the step and using the "response" function.
2. If you have already replanned {maxReplanLimit} times, respond to the step and use the "response" function.
3. Otherwise, fill out the plan.  
Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.`
);

const parser = new JsonOutputToolsParser();
export const replanner = replannerPrompt
  .pipe(new ChatOpenAI({ model: "gpt-4o" }).bindTools([planTool, responseTool]))
  .pipe(parser);
