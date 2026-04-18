"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const runOutreachPipelineAction = action({
  args: {
    transcript: v.optional(v.string()),
    audioFilePath: v.optional(v.string()),
    inboxId: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    maxEmails: v.optional(v.number()),
    includeFlow: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Import the main MCP server functionality
      const { runOutreachPipeline } = await import("./mcpNodeWrapper.js");
      
      // Call the actual MCP tool function
      const result = await runOutreachPipeline(args);
      
      return result;
    } catch (error) {
      console.error("Run outreach pipeline error:", error);
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
