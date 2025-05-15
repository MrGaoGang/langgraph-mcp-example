import * as dotenv from "dotenv";
import Koa from "koa";
import Router from "@koa/router";
import { runAgent } from "./agent";
import { MCPClient } from "custom-mcp-client";
import path from "path";
import { GraphMcpClient } from "./graph-mcp-client";
dotenv.config();
const app = new Koa();
const router = new Router();
app.use(router.routes());

router.get("/", async (ctx) => {
  const message = "获取成都的天气,并计算1+1等于几";
  console.log("step1: 初始化mcpClient");

  const mcpClient = new GraphMcpClient();
  console.log("step2: 连接mcpServer");

  await mcpClient.connectToServer(path.join(__dirname, "custom-mcp-server.ts"));
  console.log("step3: 获取mcpClient的tools，agent执行调用");

  const agent = await runAgent(mcpClient.getTools(), message);
  console.log("step6: 返回结果");

  ctx.body = agent;
});
app.listen(3000);
