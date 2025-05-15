import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

export async function main() {
  // 定义 graph 的流程的数据结构：有一个 string[] 类型的 channel -> list
  // 默认值是空数组，state 更新的逻辑是数组拼接，但是去重
  const TestStateAnnotation = Annotation.Root({
    list: Annotation<string[]>({
      default: () => [],
      reducer: (current, updated) => {
        return Array.from(new Set(current.concat(updated)));
      }
    })
  });

  const graphBuilder = new StateGraph(TestStateAnnotation);

  const node1 = (_state: typeof TestStateAnnotation.State) => {
    return {
      list: ["a", "b", "cc"]
    };
  };

  const node2 = (_state: typeof TestStateAnnotation.State) => {
    return {
      list: ["cc", "ddd"]
    };
  };
  // 添加三个节点
  const node3Action = (_state: typeof TestStateAnnotation.State) => {
    return {
      list: ["a", "ee"],
      name: 222 // 注意这里多返回了一个 222
    };
  };

  graphBuilder.addNode("node1", node1);
  graphBuilder.addNode("node2", node2);
  graphBuilder.addNode("node3", node3Action);
  graphBuilder.addEdge(START, "node1");
  graphBuilder.addEdge(START, "node2");
  graphBuilder.addEdge(START, "node3");
  graphBuilder.addEdge("node1", END);
  graphBuilder.addEdge("node2", END);
  graphBuilder.addEdge("node3", END);

  // 编译
  const graph = await graphBuilder.compile();

  //  执行，并且传入初始的 state 值，['1']
  const res = await graph.invoke({ list: ["1"] });

  // 获取 graph
  const graphStructure = await graph.getGraphAsync();

  // 绘制 mermaid 图
  const mermaid = graphStructure.drawMermaid();

  console.log(mermaid);

  console.log('====================================');
  console.log(res);
  console.log('====================================');
  // 返回结果
  return res;
}
