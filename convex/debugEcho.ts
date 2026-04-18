import { v } from "convex/values";
import { action } from "./_generated/server";

export const debugEchoAction = action({
  args: {},
  handler: async (ctx, args) => {
    try {
      // Import the main MCP server functionality
      const { debugEcho } = await import("../mcp-server-compiled.js");
      
      // Call the actual MCP tool function
      const result = await debugEcho(args);
      
      return result;
    } catch (error) {
      console.error("Debug echo error:", error);
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
  },
});
