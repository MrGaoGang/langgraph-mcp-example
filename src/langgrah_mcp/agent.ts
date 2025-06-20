import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import * as dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import { baseLLMTool } from "./default-tool";
export async function runAgent(tools: any, message: string) {
  // console.log("输入的tools:", tools);

  let openai = null;
  if (process.env.DEEPSEEK_API_KEY) {
    openai = new ChatOpenAI({
      modelName: "deepseek-chat",
      temperature: 0.7,
      apiKey: process.env.DEEPSEEK_API_KEY,
      configuration: {
        baseURL: "https://api.deepseek.com",
      },
    });
  } else {
    openai = new ChatOpenAI({
      temperature: 0,
      model: "gpt-3.5-turbo",
    });
  }

  const agent = createReactAgent({
    llm: openai,
    tools: [...tools, baseLLMTool],
  });

  const inputs = {
    messages: [{ role: "user", content: message, type: "text" }],
  };
  const graph = await agent.getGraphAsync({
    // 重试次数
    recursionLimit: 3,
  });
  const graphImg = graph?.drawMermaid();
  console.log("====================================");
  console.log(graphImg);
  console.log("====================================");
  console.log("step4: 开始执行 " + message);

  const stream = await agent.stream(inputs, {
    streamMode: "values",
  });
  let res = null;
  for await (const { messages } of stream) {
    console.log(messages);
    res = messages;
  }
  return res;
  // Returns the messages in the state at each step of execution
}
