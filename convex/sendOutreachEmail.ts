import { v } from "convex/values";
import { action } from "./_generated/server";

export const sendOutreachEmailAction = action({
  args: {
    inboxId: v.string(),
    toEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Import the main MCP server functionality
      const { sendOutreachEmail } = await import("../mcp-server-compiled.js");
      
      // Call the actual MCP tool function
      const result = await sendOutreachEmail(args);
      
      return result;
    } catch (error) {
      console.error("Send outreach email error:", error);
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
