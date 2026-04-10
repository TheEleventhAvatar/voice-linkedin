import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "mcp-server.ts"],
});

const client = new Client({
  name: "voice-agent",
  version: "1.0.0",
});

await client.connect(transport);

const result = await client.callTool({
  name: "voiceToLinkedInPost",
  arguments: {
    filePath: "./Recording.m4a",
  },
});

console.log(JSON.stringify(result, null, 2));
