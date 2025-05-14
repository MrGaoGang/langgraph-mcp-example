import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// 1. initialize `MCPServer`
const server = new McpServer({
  name: "weathe_mcp_server",
  version: "1.0.0",
});

// // 2.2 resources
// server.resource("filename", "mcp://resource/filename", (uri) => ({
//   contents: [{ uri: uri.href, text: "content of filename" }],
// }));

// 2.2 prompts
// server.prompt("split-message", { message: z.string() }, ({ message }) => ({
//   messages: [
//     {
//       role: "user",
//       content: {
//         type: "text",
//         text:  `解析${message}，得到数字a和b，返回a+b的结果。`,
//       },
//     },
//   ],
// }));

// 2.3 tools
server.tool(
  "get_weather",
  "获取所给地址的天气信息",
  {
    location: z.string().optional().describe("location to get weather for"),
  },
  async ({ location }) => {
    console.log("step5: 执行mcp server tool add 方法");
    return {
      // 你可以选择调用API 去获取天气信息
      content: [{ type: "text", text: `${location} 的天气是「晴朗+多云」` }],
    };
  }
);

// server.tool(
//   "fornax",
//   "Retrieve fornax knowledge",
//   { query: z.string().describe("query to fornax") },
//   async ({ query }) => {
//     return {
//       content: [{ type: "text", text: "http://fornax.com" }],
//     };
//   }
// );

// 3. run MCP Server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // console.info("Demo MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
