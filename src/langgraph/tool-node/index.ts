import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
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
  const modelWithTools = new ChatOpenAI({
    model: "gpt-3.5-turbo",
    temperature: 0,
    maxTokens: 600
  }).bindTools(tools);

  // 工具的集合
  const toolNodeForGraph = new ToolNode(tools);

  const shouldContinue = (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    // 如果AI Message 里有 tool_calls，就进入 tools 节点 去处理
    if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
      return "tools";
    }
    return "__end__";
  };

  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
    const response = await modelWithTools.invoke(messages);
    return { messages: response };
  };

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNodeForGraph)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent")
    .compile();

  const inputs = {
    messages: [{ role: "user", content: "what is the weather in SF?" }]
  };

  const graphImg =( await graph.getGraphAsync())?.drawMermaid()
  console.log('=======merchantid=====start==');
  
  console.log(graphImg);
  
  console.log('=======merchantid=====end==');

  const stream = await graph.stream(inputs, {
    streamMode: "values"
  });

  for await (const { messages } of stream) {
    console.log(messages);
  }
  // Returns the messages in the state at each step of execution
}

// =================== 下面是真实的输出 ==============
// [
//     HumanMessage {
//       "id": "94b78bd3-42cb-4489-84c9-50bf5766eaa8",
//       "content": "what is the weather in SF?",
//       "additional_kwargs": {},
//       "response_metadata": {}
//     }
//   ]
//   [
//     HumanMessage {
//       "id": "94b78bd3-42cb-4489-84c9-50bf5766eaa8",
//       "content": "what is the weather in SF?",
//       "additional_kwargs": {},
//       "response_metadata": {}
//     },
//     AIMessage {
//       "id": "chatcmpl-BCmEAklWcybBrHURQsDspoY8uGBqv",
//       "content": "",
//       "additional_kwargs": {
//         "tool_calls": [
//           {
//             "id": "call_gqkKyGeA2md2fWWKEh6uekpf",
//             "type": "function",
//             "function": "[Object]"
//           }
//         ]
//       },
//       "response_metadata": {
//         "tokenUsage": {
//           "promptTokens": 61,
//           "completionTokens": 16,
//           "totalTokens": 77
//         },
//         "finish_reason": "tool_calls",
//         "model_name": "gpt-3.5-turbo-0125"
//       },
//       "tool_calls": [
//         {
//           "name": "get_weather",
//           "args": {
//             "location": "San Francisco"
//           },
//           "type": "tool_call",
//           "id": "call_gqkKyGeA2md2fWWKEh6uekpf"
//         }
//       ],
//       "invalid_tool_calls": [],
//       "usage_metadata": {
//         "output_tokens": 16,
//         "input_tokens": 61,
//         "total_tokens": 77,
//         "input_token_details": {
//           "audio": 0,
//           "cache_read": 0
//         },
//         "output_token_details": {
//           "audio": 0,
//           "reasoning": 0
//         }
//       }
//     }
//   ]
//   [
//     HumanMessage {
//       "id": "94b78bd3-42cb-4489-84c9-50bf5766eaa8",
//       "content": "what is the weather in SF?",
//       "additional_kwargs": {},
//       "response_metadata": {}
//     },
//     AIMessage {
//       "id": "chatcmpl-BCmEAklWcybBrHURQsDspoY8uGBqv",
//       "content": "",
//       "additional_kwargs": {
//         "tool_calls": [
//           {
//             "id": "call_gqkKyGeA2md2fWWKEh6uekpf",
//             "type": "function",
//             "function": "[Object]"
//           }
//         ]
//       },
//       "response_metadata": {
//         "tokenUsage": {
//           "promptTokens": 61,
//           "completionTokens": 16,
//           "totalTokens": 77
//         },
//         "finish_reason": "tool_calls",
//         "model_name": "gpt-3.5-turbo-0125"
//       },
//       "tool_calls": [
//         {
//           "name": "get_weather",
//           "args": {
//             "location": "San Francisco"
//           },
//           "type": "tool_call",
//           "id": "call_gqkKyGeA2md2fWWKEh6uekpf"
//         }
//       ],
//       "invalid_tool_calls": [],
//       "usage_metadata": {
//         "output_tokens": 16,
//         "input_tokens": 61,
//         "total_tokens": 77,
//         "input_token_details": {
//           "audio": 0,
//           "cache_read": 0
//         },
//         "output_token_details": {
//           "audio": 0,
//           "reasoning": 0
//         }
//       }
//     },
//     ToolMessage {
//       "id": "78e84fdc-6697-4071-b439-2679bdb4343d",
//       "content": "It's 60 degrees and foggy.",
//       "name": "get_weather",
//       "additional_kwargs": {},
//       "response_metadata": {},
//       "tool_call_id": "call_gqkKyGeA2md2fWWKEh6uekpf"
//     }
//   ]
//   [
//     HumanMessage {
//       "id": "94b78bd3-42cb-4489-84c9-50bf5766eaa8",
//       "content": "what is the weather in SF?",
//       "additional_kwargs": {},
//       "response_metadata": {}
//     },
//     AIMessage {
//       "id": "chatcmpl-BCmEAklWcybBrHURQsDspoY8uGBqv",
//       "content": "",
//       "additional_kwargs": {
//         "tool_calls": [
//           {
//             "id": "call_gqkKyGeA2md2fWWKEh6uekpf",
//             "type": "function",
//             "function": "[Object]"
//           }
//         ]
//       },
//       "response_metadata": {
//         "tokenUsage": {
//           "promptTokens": 61,
//           "completionTokens": 16,
//           "totalTokens": 77
//         },
//         "finish_reason": "tool_calls",
//         "model_name": "gpt-3.5-turbo-0125"
//       },
//       "tool_calls": [
//         {
//           "name": "get_weather",
//           "args": {
//             "location": "San Francisco"
//           },
//           "type": "tool_call",
//           "id": "call_gqkKyGeA2md2fWWKEh6uekpf"
//         }
//       ],
//       "invalid_tool_calls": [],
//       "usage_metadata": {
//         "output_tokens": 16,
//         "input_tokens": 61,
//         "total_tokens": 77,
//         "input_token_details": {
//           "audio": 0,
//           "cache_read": 0
//         },
//         "output_token_details": {
//           "audio": 0,
//           "reasoning": 0
//         }
//       }
//     },
//     ToolMessage {
//       "id": "78e84fdc-6697-4071-b439-2679bdb4343d",
//       "content": "It's 60 degrees and foggy.",
//       "name": "get_weather",
//       "additional_kwargs": {},
//       "response_metadata": {},
//       "tool_call_id": "call_gqkKyGeA2md2fWWKEh6uekpf"
//     },
//     AIMessage {
//       "id": "chatcmpl-BCmEBCY6CzVIME25oFfXR9MTS5Vbl",
//       "content": "The weather in San Francisco is currently 60 degrees and foggy.",
//       "additional_kwargs": {},
//       "response_metadata": {
//         "tokenUsage": {
//           "promptTokens": 93,
//           "completionTokens": 16,
//           "totalTokens": 109
//         },
//         "finish_reason": "stop",
//         "model_name": "gpt-3.5-turbo-0125"
//       },
//       "tool_calls": [],
//       "invalid_tool_calls": [],
//       "usage_metadata": {
//         "output_tokens": 16,
//         "input_tokens": 93,
//         "total_tokens": 109,
//         "input_token_details": {
//           "audio": 0,
//           "cache_read": 0
//         },
//         "output_token_details": {
//           "audio": 0,
//           "reasoning": 0
//         }
//       }
//     }
//   ]