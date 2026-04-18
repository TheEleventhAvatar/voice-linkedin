"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const draftOutreachEmailAction = action({
  args: {
    recruiter: v.object({
      name: v.string(),
      company: v.string(),
      email: v.string(),
      location: v.string(),
      focus: v.string(),
    }),
    targetRole: v.string(),
    location: v.string(),
    personalizedPitch: v.optional(v.string()),
    audioScript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Import the main MCP server functionality
      const { draftOutreachEmail } = await import("./mcpNodeWrapper.js");
      
      // Call the actual MCP tool function
      const result = await draftOutreachEmail(args);
      
      return result;
    } catch (error) {
      console.error("Draft outreach email error:", error);
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
