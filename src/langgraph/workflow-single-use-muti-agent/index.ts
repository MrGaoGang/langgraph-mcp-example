import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { Annotation, StateGraph, END, START, MessagesAnnotation, messagesStateReducer, Command } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, isAIMessage, ToolMessage } from "@langchain/core/messages";

function getDistanceFromChina(location: string) {
  const DistanceStateAnnotation = Annotation.Root({
    distanceMessages: Annotation<BaseMessage[]>({
      default: () => [
        new HumanMessage({
          content: `what is the Distance from ${location} to Chengdu, China`
        })
      ],
      reducer: messagesStateReducer
    })
  });

  // 手动顶一个tool
  const getDistance = tool(
    async (input, config) => {
      if (input.location.toLowerCase().includes("san francisco")) {
        // 这里可以使用高德的 MCP server 获取距离
        return new Command({
          update: {
            distanceMessages: [
              new ToolMessage({
                content: "It's 1000 km",
                tool_call_id: config.toolCall.id
              })
            ]
          }
        });
      } else {
        /**
         * 注意！！！ 如果是由Agent 调用的 并行任务，这里的返回值需要使用 Command 完成，不能直接返回一个 字符串，否则会报错
         */
        return new Command({
          update: {
            distanceMessages: [
              new ToolMessage({
                content: "It's 0 km",
                tool_call_id: config.toolCall.id
              })
            ]
          }
        });
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
  const modelWithTools = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 0,
    maxTokens: 600
  }).bindTools(tools);

  // 工具的集合
  const toolNodeForGraph = new ToolNode(tools);

  const shouldContinue = (state: typeof DistanceStateAnnotation.State) => {
    const { distanceMessages = [] } = state;
    const messages = distanceMessages;

    const lastMessage = messages[messages.length - 1];
    if (isAIMessage(lastMessage) && (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0)) {
      return END;
    } else {
      return "continue";
    }
  };

  const callModel = async (state: typeof DistanceStateAnnotation.State) => {
    const { distanceMessages } = state;

    const response = await modelWithTools.invoke(distanceMessages);
    // response.additional_kwargs["message_type"] = "distance";

    return { distanceMessages: response };
  };
  return {
    callModel,
    toolNodeForGraph,
    shouldContinue,
    DistanceStateAnnotation
  };
}

function getWether(location: string) {
  const WeatherStateAnnotation = Annotation.Root({
    weatherMessages: Annotation<BaseMessage[]>({
      default: () => [
        new HumanMessage({
          content: `what is the weather in ${location}`
        })
      ],
      reducer: (current, updated) => {
        return Array.from(new Set(current.concat(updated)));
      }
    })
  });

  // 手动顶一个tool
  const getWeather = tool(
    async (input, config) => {
      if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
        /**
         * 注意！！！ 如果是由Agent 调用的 并行任务，这里的返回值需要使用 Command 完成，不能直接返回一个 字符串，否则会报错
         */
        return new Command({
          update: {
            weatherMessages: [
              new ToolMessage({
                content: "It's 60 degrees and foggy.",
                tool_call_id: config.toolCall.id
              })
            ]
          }
        });
      } else {
        return new Command({
          update: {
            weatherMessages: [
              new ToolMessage({
                content: "It's 90 degrees and sunny.",
                tool_call_id: config.toolCall.id
              })
            ]
          }
        });
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
  const modelWithTools = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 0,
    maxTokens: 600
  }).bindTools(tools);

  // 工具的集合
  const toolNodeForGraph = new ToolNode(tools);
  const shouldContinue = (state: typeof WeatherStateAnnotation.State) => {
    const { weatherMessages } = state;
    const messages = weatherMessages;

    const lastMessage = messages[messages.length - 1];
    if (isAIMessage(lastMessage) && (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0)) {
      console.log("===weather===lastMessage===== END");

      return END;
    } else {
      return "continue";
    }
  };

  const callModel = async (state: typeof WeatherStateAnnotation.State) => {
    const { weatherMessages } = state;
    const messages = weatherMessages;
    const response = await modelWithTools.invoke(messages);
    // response.additional_kwargs["message_type"] = "wether";
    return { weatherMessages: response };
  };

  return {
    callModel,
    toolNodeForGraph,
    shouldContinue,
    WeatherStateAnnotation
  };
}
export async function main() {
  const location = "SF";

  const weather = getWether(location);
  const distance = getDistanceFromChina(location);

  const StateAnnotation = Annotation.Root({
    location: Annotation<string>(),
    ...weather.WeatherStateAnnotation.spec,
    ...distance.DistanceStateAnnotation.spec,
    result: Annotation<string>()
  });

  // 创建工作流
  const workflow = new StateGraph(StateAnnotation);
  workflow.addNode("weather_agent", weather.callModel);
  /**
   * 注意事项！！！
   * 如果N个ToolNode并行调用，则不能直接使用 callModel 自动调用 tools 的形式
   *   workflow.addNode("weather_tools", weather.toolNodeForGraph);
   * 原因是 ToolNode 源码默认消费的是 state 中的 messages 字段，而实际上是没有这个字段的（因为不同的agent使用不同的message字段存储）
   * 所以需要读取上下文数据后 自定义调用 invoke 方法，并解析出内部的数据
   *
   */
  workflow.addNode("weather_tools", async state => {
    const data: Command[]  = await weather.toolNodeForGraph.invoke(state.weatherMessages);
    //data =  [
    //   Command {
    //     lg_name: 'Command',
    //     lc_direct_tool_output: true,
    //     graph: undefined,
    //     update: { weatherMessages: [Array] },
    //     resume: undefined,
    //     goto: []
    //   }
    // ]
    const merges = data?.map(ele => ele.update?.weatherMessages) || [];
    const weatherMessages: any = [];
    merges.forEach(ele => {
      if (Array.isArray(ele)) {
        weatherMessages.push(...ele);
      }
    });
    return {
      weatherMessages: weatherMessages
    };
  });
  workflow.addNode("distance_agent", distance.callModel);
  workflow.addNode("distance_tools", async state => {
    const data: Command[] = await distance.toolNodeForGraph.invoke(state.distanceMessages);
        //data =  [
    //   Command {
    //     lg_name: 'Command',
    //     lc_direct_tool_output: true,
    //     graph: undefined,
    //     update: { distanceMessages: [Array] },
    //     resume: undefined,
    //     goto: []
    //   }
    // ]
    const merges = data?.map(ele => ele.update?.distanceMessages) || [];
    const messages: any = [];
    merges.forEach(ele => {
      if (Array.isArray(ele)) {
        messages.push(...ele);
      }
    });
    return {
      distanceMessages: messages
    };
  });

  workflow.addNode("messgae_wrapper", state => {
    return {
      result:
        state.weatherMessages[state.weatherMessages.length - 1].content +
        "\n" +
        state.distanceMessages[state.distanceMessages.length - 1].content
    };
  });

  workflow.addEdge(START, "weather_agent");
  workflow.addEdge(START, "distance_agent");

  workflow.addEdge("weather_tools", "weather_agent");

  workflow.addConditionalEdges("weather_agent", weather.shouldContinue, {
    continue: "weather_tools",
    [END]: "messgae_wrapper"
  });

  workflow.addEdge("distance_tools", "distance_agent");
  workflow.addConditionalEdges("distance_agent", distance.shouldContinue, {
    continue: "distance_tools",
    [END]: "messgae_wrapper"
  });

  workflow.addEdge("messgae_wrapper", END);

  const graph = await workflow.compile();
  const graphStructure = await graph.getGraphAsync();
  const graphImg = graphStructure?.drawMermaid();
  console.log("=======merchantid=====start==");
  console.log(graphImg);
  console.log("=======merchantid=====end==");

  const stream = await graph.stream(
    {
      location
    },
    {
      streamMode: "values"
    }
  );

  let res = "";

  for await (const state of stream) {
    res = state.result;
    // res =
    //   state.weatherMessages[state.weatherMessages.length - 1].content +
    //   "\n" +
    //   state.distanceMessages[state.distanceMessages.length - 1].content;
    // console.log("distanceMessages====== ", distanceMessages);
    // console.log("weatherMessages====== ", weatherMessages);
  }
  // console.log("=======result=========");

  console.log(res);
}
