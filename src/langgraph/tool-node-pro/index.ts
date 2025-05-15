import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";

export async function main() {
  // 手动顶一个tool
  const getWeather = tool(
    input => {
      if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
        return "It's 60 degrees and foggy.";
      } else {
        return "It's 90 degrees and sunny.";
      }
    },
    {
      name: "get_weather",
      description: "Call to get the current weather.",
      schema: z.object({
        location: z.string().describe("Location to get the weather for.")
      })
    }
  );

  const tools = [getWeather];
  const agent = createReactAgent({
    llm: new ChatOpenAI({
      temperature: 0,
      model: "gpt-3.5-turbo",
      maxTokens: 600
    }),
    tools: tools
  });

  const inputs = {
    messages: [{ role: "user", content: "what is the weather in SF?" }]
  };

  const graph = await agent.getGraphAsync();
  const graphImg = graph?.drawMermaid();
  console.log("=======merchantid=====start==");

  console.log(graphImg);

  console.log("=======merchantid=====end==");

  const stream = await agent.stream(inputs, {
    streamMode: "values"
  });

  for await (const { messages } of stream) {
    console.log(messages);
  }
  // Returns the messages in the state at each step of execution
}
