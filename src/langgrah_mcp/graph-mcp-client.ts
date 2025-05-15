import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export class GraphMcpClient {
  tools: any = [];
  async connectToServer(serverScriptPath: string) {
    // 连接到MCP服务器
    const client = new MultiServerMCPClient({
      throwOnLoadError: true,
      prefixToolNameWithServerName: true,
      additionalToolNamePrefix: "mcp",

      // Server configuration
      mcpServers: {
        weather: {
          transport: "stdio",
          command: "tsx",
          args: [serverScriptPath],
          restart: {
            enabled: true,
            maxAttempts: 3,
            delayMs: 1000,
          },
        },

        // // here's a filesystem server
        // filesystem: {
        //   transport: "stdio",
        //   command: "npx",
        //   args: ["-y", "@modelcontextprotocol/server-filesystem"],
        // },
      },
    });
    const tools = await client.getTools();
    this.tools = tools;
  }

  getTools() {
    return this.tools;
  }
}
