import { Annotation, END, Send, START, StateGraph } from "@langchain/langgraph";

export async function main() {
  const TestStateAnnotation = Annotation.Root({
    inputList: Annotation<string[]>,
    output: Annotation<Record<string, string[]>>({
      reducer: (current, updated) => ({ ...current, ...updated })
    })
  });

  const graphBuilder = new StateGraph(TestStateAnnotation);

  const nodeAction = (str: string) => {
    // 并且因为 node1 每次返回的 State 类型是是 { output : Record<string, string[]> }，可以通过我们的 reducer 直接合并成最终的结果。
    return {
      output: { [str]: Array.from(str) }
    };
  };

  const loopNode = (state: typeof TestStateAnnotation.State) => {
    return state;
  };
  const condition = (state: typeof TestStateAnnotation.State) => {
    const { inputList } = state;
    const first = inputList.shift();
    if (!first) {
      return END;
    }
  
    return new Send('node1', first);
  };

  graphBuilder
  .addNode('node1', nodeAction)
  .addNode('loop', loopNode)
  .addEdge(START, 'loop')
  .addConditionalEdges('loop', condition, ['node1', END])
  .addEdge('node1', 'loop');

  // 编译
  const graph = await graphBuilder.compile();

  //  执行，并且传入初始的 state 值，['1']
  const res = await graph.invoke({ inputList: ["langchain", "langgraph", "langsmith"] });

  // 获取 graph
  const graphStructure = await graph.getGraphAsync();

  // 绘制 mermaid 图
  const mermaid = graphStructure.drawMermaid();

  console.log(mermaid);

  console.log("====================================");
  console.log(res);
  console.log("====================================");
  // 返回结果
  return res;
}
