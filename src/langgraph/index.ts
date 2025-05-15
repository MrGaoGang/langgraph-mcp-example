import * as dotenv from 'dotenv'
dotenv.config()

// ============= 普通的langgraph 用法 =========

// import { main } from "./simple/index";

// main()


// ============= 条件edge langgraph 用法 =========
// import { main } from "./condition-edge/index";

// main()


// ============= 条件edge + 并行节点  langgraph 用法 =========

// import { main } from "./condition-edge-pro"

// main()

// =============使用 send 实现 并行任务=========

// import { main } from "./send-parallel/index"

// main()


// =============使用 send 实现 循环任务=========

// import { main } from "./send-loop"

// main()


// =============基于 tool node 实现 任务调度=========


// import { main } from "./tool-node/index"

// main()


// =============基于 createReactAgent 实现 任务调度=========


import { main } from "./workflow-single-use-muti-agent/index"

main()