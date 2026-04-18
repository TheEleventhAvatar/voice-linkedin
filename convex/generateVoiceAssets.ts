"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

export const generateVoiceAssetsAction = action({
  args: {
    transcript: v.string(),
    targetRole: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Import the main MCP server functionality
      const { generateVoiceAssets } = await import("./mcpNodeWrapper.js");
      
      // Call the actual MCP tool function
      const result = await generateVoiceAssets(args);
      
      return result;
    } catch (error) {
      console.error("Generate voice assets error:", error);
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
