"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const matchRecruitersAction = action({
  args: {
    targetRole: v.string(),
    location: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Import the main MCP server functionality
      const { matchRecruiters } = await import("./mcpNodeWrapper.js");
      
      // Call the actual MCP tool function
      const result = await matchRecruiters(args);
      
      return result;
    } catch (error) {
      console.error("Match recruiters error:", error);
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
