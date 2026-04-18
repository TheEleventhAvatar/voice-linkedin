import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["mcp-convex.js"],
});

const client = new Client({
  name: "voice-agent",
  version: "1.0.0",
});

await client.connect(transport);

// Test ping tool
const pingResult = await client.callTool({
  name: "ping",
  arguments: {},
});

console.log("Ping result:", JSON.stringify(pingResult, null, 2));

// Test voiceToLinkedInPost tool
try {
  const result = await client.callTool({
    name: "voiceToLinkedInPost",
    arguments: {
      filePath: "./Recording.m4a",
    },
  });
  console.log("voiceToLinkedInPost result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.error("voiceToLinkedInPost error:", error);
}

// Test parseOutreachRequest tool
try {
  const parseResult = await client.callTool({
    name: "parseOutreachRequest",
    arguments: {
      transcript: "Looking for SDE interns in Bangalore",
    },
  });
  console.log("parseOutreachRequest result:", JSON.stringify(parseResult, null, 2));
} catch (error) {
  console.error("parseOutreachRequest error:", error);
}

// Test matchRecruiters tool
try {
  const matchResult = await client.callTool({
    name: "matchRecruiters",
    arguments: {
      targetRole: "SDE interns",
      location: "Bangalore",
    },
  });
  console.log("matchRecruiters result:", JSON.stringify(matchResult, null, 2));
} catch (error) {
  console.error("matchRecruiters error:", error);
}
