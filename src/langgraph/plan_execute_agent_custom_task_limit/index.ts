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
import { execSummary } from "./summry";
import { baseLLMTool } from "../../langgrah_mcp/default-tool";

// ✅ 定义搜索工具
const searchTool = new TavilySearchResults({
  maxResults: 3,
  apiKey: process.env.TAVILY_API_KEY,
});

// ✅ 定义工具列表
const tools = [searchTool, baseLLMTool];

// 🎯 2.1 定义状态（State）

const MAX_PLAN_COUNT = 3;

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
  // 避免一直replan，最多replan n次
  replanCount: Annotation<number>({
    reducer: (current, updated) => updated ?? current ?? 1,
    default: () => 1,
  }),
  // 是否可使用再次计划
  canNotUseReplan: Annotation<boolean>({
    reducer: (current, updated) => updated ?? current ?? false,
    default: () => false,
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
    console.log("input:", state, "\noutput:", plan.steps);
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
    console.log("执行计划名称: ", task);
    // console.log("input:", task, "\noutput:", messages);

    return {
      pastSteps: [[task, messages[messages.length - 1].content.toString()]],
      plan: state.plan.slice(1),
    };
  }

  async function summaryResult(state: typeof PlanExecuteState.State) {
    console.log("============开始【总结】结果=======start========");
    console.log("\:pastSteps", state.pastSteps);
    const result = await execSummary({
      input: state.input,
      pastSteps: state.pastSteps
        .map(([step, result]) => `${step}: ${result}`)
        .join("\n"),
    });
    return {
      response: result,
    };
  }

  async function replanStep(
    state: typeof PlanExecuteState.State
  ): Promise<Partial<typeof PlanExecuteState.State>> {
    if (state.replanCount >= MAX_PLAN_COUNT) {
      return {
        response:
          "已经重新计划次数已达到上线，无需再重新计划，可直接执行下一步骤",
        canNotUseReplan: true,
      };
    }
    const output = await replanner.invoke({
      input: state.input,
      plan: state.plan.join("\n"),
      pastSteps: state.pastSteps
        .map(([step, result]) => `${step}: ${result}`)
        .join("\n"),
      replanCount: state.replanCount,
      maxReplanLimit: MAX_PLAN_COUNT,
    });

    console.log(
      "============重新【制定】计划 第" +
        state.replanCount +
        "次=======start========"
    );
    const toolCall = output?.[0];
    // console.log("input:", state, "\noutput:", toolCall.args);

    if (toolCall?.type == "response") {
      return {
        response: toolCall.args?.response,
        replanCount: state.replanCount + 1,
      };
    }
    console.log("重新计划名称: ", toolCall.args?.steps);

    return { plan: toolCall.args?.steps, replanCount: state.replanCount + 1 };
  }

  function shouldReplan(state: typeof PlanExecuteState.State) {
    if (state.plan.length === 0) {
      return "summary";
    }
    if (state?.canNotUseReplan) {
      return "next_task";
    }
    return "replan";
  }

  const workflow = new StateGraph(PlanExecuteState)
    .addNode("planner", planStep)
    .addNode("execute", executeStep)
    .addNode("replan", replanStep)
    .addNode("summary", summaryResult)
    .addEdge(START, "planner")
    .addEdge("planner", "execute")
    .addEdge("summary", END)
    .addConditionalEdges("execute", shouldReplan, {
      // 重新执行计划
      replan: "replan",
      // 继续执行下一个计划（大概率是replan超过次数）
      next_task: "execute",
      // 结束
      summary: "summary",
    })
    .addEdge("replan", "execute");

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

  const config = { recursionLimit: 50 };
  const inputs = {
    input: "2024年字节跳动发布的AI产品有哪些? 使用中文回答,并列举对应的产品访问链接",
  };

  for await (const event of await graph.stream(inputs, config)) {
    console.log("result:", event);
  }
  ``;
}
