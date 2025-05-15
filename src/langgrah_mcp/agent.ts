import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import * as dotenv from "dotenv";
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";
import { baseLLMTool } from "./default-tool";
export async function runAgent(tools: any, message: string) {
  // console.log("输入的tools:", tools);

  const agent = createReactAgent({
    llm: new ChatOpenAI({
      temperature: 0,
      model: "gpt-3.5-turbo",
      maxTokens: 600,
    }),
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
  console.log('====================================');
  console.log(graphImg);
  console.log('====================================');
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
