import { v } from "convex/values";
import { action } from "./_generated/server";

export const exportOutreachPipelineFlowAction = action({
  args: {},
  handler: async (ctx, args) => {
    try {
      // Import the main MCP server functionality
      const { exportOutreachPipelineFlow } = await import("./mcpNodeWrapper.js");
      
      // Call the actual MCP tool function
      const result = await exportOutreachPipelineFlow();
      
      return result;
    } catch (error) {
      console.error("Export outreach pipeline flow error:", error);
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
