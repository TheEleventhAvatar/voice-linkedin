#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/index.js";

// Import the Convex MCP server
import { mcp } from "./convex/mcp.js";

async function main() {
  const transport = new StdioServerTransport();
  
  // Convert Convex MCP server to standard MCP server
  const server = new McpServer(
    {
      name: mcp.name,
      version: mcp.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools from Convex MCP server
  for (const [toolName, toolConfig] of Object.entries(mcp.tools)) {
    await server.registerTool(toolName, {
      description: toolConfig.description,
      inputSchema: toolConfig.args ? toolConfig.args({}) : {},
    }, async (args) => {
      try {
        // Call the Convex action
        const result = await toolConfig.handler(null, args);
        return result;
      } catch (error) {
        console.error(`Error in tool ${toolName}:`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  await server.connect(transport);
  console.error("Voice LinkedIn MCP Server (Convex) running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
