
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { ChatOpenAI } from "@langchain/openai";
import { PlanAndExecuteAgentExecutor } from "langchain/experimental/plan_and_execute";
export async function main() {
  const tools = [
    new TavilySearchResults({
      maxResults: 3,
      apiKey: process.env.TAVILY_API_KEY,
    }),
  ];
  const model = new ChatOpenAI({
    temperature: 0,
    model: "gpt-4-turbo",
    verbose: true,
  });
  const executor = await PlanAndExecuteAgentExecutor.fromLLMAndTools({
    llm: model,
    tools,
  });

  const result = await executor.invoke({
    input: "帮我找出最近三条全球重大科技新闻，给出标题和简短摘要。",
  });

  console.log({ result });
}
