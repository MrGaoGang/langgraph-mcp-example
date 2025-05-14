import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
import { DynamicStructuredTool, tool } from "@langchain/core/tools";
import z from "zod";
import jsonSchemaToZod from "json-schema-to-zod";

dotenv.config();

export class MCPClient {
  private mcp: Client;
  private transport: StdioClientTransport | null = null;
  private tools: any[] = [];

  constructor() {
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }
  async connectToServer(serverScriptPath: string) {
    try {
      const isJs =
        serverScriptPath.endsWith(".js") || serverScriptPath.endsWith(".ts");
      if (!isJs) {
        throw new Error("Server script must be a .js or .py  or .tsfile");
      }
      const command = process.execPath;

      this.transport = new StdioClientTransport({
        command: "tsx",
        args: [serverScriptPath],
      });
      this.mcp.connect(this.transport);

      const toolsResult = await this.mcp.listTools();
      this.tools = await Promise.all(
        toolsResult.tools.map((item) => {
  
          return new DynamicStructuredTool({
            name: item.name,
            description: item.description || "",
            schema: item.inputSchema,
            responseFormat: "content_and_artifact",
            func: async (args: any) => {
              console.log(...args, "=======...args====");
              const result = await this.mcp.callTool({
                name: item.name,
                arguments: args,
              });
              console.log(...args, "=======...args----output====");
              // 此处还有问题 需要转换成 langchain 的格式
              return result.content;
            },
          });
        })
      );
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name)
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
  }
  getTools() {
    return this.tools;
  }

  getMCP() {
    return this.mcp;
  }

  // methods will go here
}
