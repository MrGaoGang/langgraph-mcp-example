import * as dotenv from "dotenv";
dotenv.config();
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { Annotation } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { planner } from "./plan";
import { END, START, StateGraph } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";
import { replanner } from "./replan";

// ✅ 定义搜索工具
const searchTool = new TavilySearchResults({
  maxResults: 3,
  apiKey: process.env.TAVILY_API_KEY,
});

// ✅ 定义工具列表
const tools = [searchTool];

// 🎯 2.1 定义状态（State）

const PlanExecuteState = Annotation.Root({
  input: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "",
  }),
  plan: Annotation<string[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  pastSteps: Annotation<[string, string][]>({
    reducer: (x, y) => x.concat(y),
  }),
  response: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
});
export async function main() {
  const agentExecutor = createReactAgent({
    llm: new ChatOpenAI({ model: "gpt-4o" }),
    tools: tools,
  });

  async function planStep(
    state: typeof PlanExecuteState.State
  ): Promise<Partial<typeof PlanExecuteState.State>> {
    const plan = await planner.invoke({ objective: state.input });
    console.log("============开始【制定】计划=======start========");
    console.log(
      "input:",
      state,
      "\noutput:",
      plan.steps
    );
    return { plan: plan.steps };
  }
  async function executeStep(
    state: typeof PlanExecuteState.State,
    config?: RunnableConfig
  ): Promise<Partial<typeof PlanExecuteState.State>> {
    const task = state.plan[0];
    const input = {
      messages: [new HumanMessage(task)],
    };
    const { messages } = await agentExecutor.invoke(input, config);
    console.log("============开始【执行】计划=======start========");
    console.log("input:", task, "\noutput:", messages);

    return {
      pastSteps: [[task, messages[messages.length - 1].content.toString()]],
      plan: state.plan.slice(1),
    };
  }

  async function replanStep(
    state: typeof PlanExecuteState.State
  ): Promise<Partial<typeof PlanExecuteState.State>> {
    const output = await replanner.invoke({
      input: state.input,
      plan: state.plan.join("\n"),
      pastSteps: state.pastSteps
        .map(([step, result]) => `${step}: ${result}`)
        .join("\n"),
    });

    console.log("============重新【制定】计划=======start========");
    console.log("input:", state, "\noutput:", output);
    const toolCall = output?.[0];

    if (toolCall?.type == "response") {
      return { response: toolCall.args?.response };
    }

    return { plan: toolCall.args?.steps };
  }

  function shouldEnd(state: typeof PlanExecuteState.State) {
    return state.response ? "true" : "false";
  }

  const workflow = new StateGraph(PlanExecuteState)
    .addNode("planner", planStep)
    .addNode("agent", executeStep)
    .addNode("replan", replanStep)
    .addEdge(START, "planner")
    .addEdge("planner", "agent")
    .addEdge("agent", "replan")
    .addConditionalEdges("replan", shouldEnd, {
      true: END,
      false: "agent",
    });

  // Finally, we compile it!
  // This compiles it into a LangChain Runnable,
  // meaning you can use it as you would any other runnable
  const graph = workflow.compile();
  // 获取 graph
  const graphStructure = await graph.getGraphAsync();
  // 绘制 mermaid 图
  const mermaid = graphStructure.drawMermaid();
  console.log("==================mermaid==================");
  console.log(mermaid);
  console.log("====================================");

  const config = { recursionLimit: 20 };
  const inputs = {
    input: "what is the hometown of the 2024 Australian open winner?",
  };

  for await (const event of await graph.stream(inputs, config)) {
    console.log('result:',event);
  }
  ``;
}
