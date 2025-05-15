import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { Annotation, StateGraph, END, START } from "@langchain/langgraph";

async function getDistanceFromChina(location: string) {
  // 手动顶一个tool
  const getDistance = tool(
    input => {
      if (input.location.toLowerCase().includes("san francisco")) {
        // 这里可以使用高德的 MCP server 获取距离
        return "It's 1000 km";
      } else {
        return "It's 0 km";
      }
    },
    {
      name: "get_distance",
      description: "Call to get the distance from the location to Chengdu China.",
      schema: z.object({
        location: z.string().describe("Current Location to get the distance for.")
      })
    }
  );

  const tools = [getDistance];
  const agent = createReactAgent({
    llm: new ChatOpenAI({
      temperature: 0,
      model: "gpt-3.5-turbo",
      maxTokens: 600
    }),
    tools: tools,
    prompt: ""
  });

  const inputs = {
    messages: [{ role: "user", content: `what is the Distance from ${location} to Chengdu, China` }]
  };

  const graph = await agent.getGraphAsync();
  const graphImg = graph?.drawMermaid();

  const stream = await agent.stream(inputs, {
    streamMode: "values",
    // subgraphs: true
  });

  let result = "";

  for await (const { messages } of stream) {
    console.log("response= ", messages[messages.length - 1]?.content);
    
    result = messages[messages.length - 1]?.content;
  }
  // 只返回最后的输出
  return result;
}

async function getWether(location: string) {
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
    messages: [{ role: "user", content: `what is the weather in ${location}` }]
  };

  const graph = await agent.getGraphAsync();
  const graphImg = graph?.drawMermaid();

  const stream = await agent.stream(inputs, {
    streamMode: "values",
    // subgraphs: true
  });

  let result = "";

  for await (const { messages } of stream) {
    result = messages[messages.length - 1]?.content;
  }
  // 只返回最后的输出
  return result;
}
export async function main() {
  // const location = "SF";
  // const weather =  getWether(location);
  // const distance = getDistanceFromChina(location);
  // Promise.all([weather, distance]).then((result) => {
  //   console.log("result= ", result);
  // })

  const StateAnnotation = Annotation.Root({
    location: Annotation<string>(),
    messages: Annotation<string[]>({
      default: () => [],
      reducer: (current, updated) => {
        return Array.from(new Set(current.concat(updated)));
      }
    })
  });

  // 创建工作流
  const workflow = new StateGraph(StateAnnotation);
  workflow.addNode("weather", async state => {
    const weather = await getWether(state.location);
    return {
      messages: [weather]
    };
  });
  workflow.addNode("distance", async state => {
    const weather = await getDistanceFromChina(state.location);
    return {
      messages: [weather]
    };
  });
  workflow.addEdge(START, "weather");
  workflow.addEdge(START, "distance");

  workflow.addEdge("weather", END);
  workflow.addEdge("distance", END);
  const graph = await workflow.compile();
  const graphStructure = await graph.getGraphAsync();
  const graphImg = graphStructure?.drawMermaid();
  console.log("=======merchantid=====start==");
  console.log(graphImg);
  console.log("=======merchantid=====end==");

  const stream = await graph.stream(
    { location: "SF" },
    {
      streamMode: "values",
    }
  );

  let result = "";

  for await (const { messages } of stream) {
    result = messages;
  }
  console.log("=======result=========");

  console.log(result);
}
