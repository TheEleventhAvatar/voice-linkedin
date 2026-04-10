import { api } from "./_generated/api";
import { defineMcpServer, tool } from "@vibeflowai/convex-mcp";

export const mcp = defineMcpServer({
  name: "voice-linkedin-mcp",
  version: "0.1.0",
  tools: {
    voiceToLinkedInPost: tool(api.voiceToLinkedInPost.voiceToLinkedInPostAction, {
      kind: "action",
      description: "Convert voice note into LinkedIn post",
      args: (z) => ({ 
        filePath: z.string().describe("Path to the audio file") 
      }),
    }),
  },
});
