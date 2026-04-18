import { v } from "convex/values";
import { mutation, action } from "./_generated/server";

export const parseOutreachRequestAction = action({
  args: {
    transcript: v.optional(v.string()),
    audioFilePath: v.optional(v.string()),
    maxEmails: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      // Import the main MCP server functionality
      const { parseOutreachRequest } = await import("../mcp-server-compiled.js");
      
      // Call the actual MCP tool function
      const result = await parseOutreachRequest(args);
      
      return result;
    } catch (error) {
      console.error("Parse outreach request error:", error);
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
