import * as dotenv from "dotenv";
dotenv.config();
import { tool } from "@langchain/core/tools";
import OpenAI from "openai";
import z from "zod";
// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let client = null;
if (process.env.DEEPSEEK_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com",
  });
} else {
  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export const baseLLMTool = tool(
  async ({ message }) => {
    return (
      await client.chat.completions.create({
        messages: [{ role: "user", content: message }],
        model: "gpt-3.5-turbo",
        stream: false,
      })
    )?.choices[0]?.message?.content;
  },
  {
    name: "baseTool",
    description: "可以处理任何其他tools无法处理的的问题",
    schema: z.object({
      message: z.string().describe("all the message"),
    }),
  }
);

// console.log('===============1111=====================');
// console.log( z.object({
//   message: z.string().describe("all the message"),
// }));
// console.log('================1111====================');
