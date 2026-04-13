import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const server = new McpServer(
  {
    name: "voice-linkedin-mcp",
    version: "1.0.0",
  }
);

// Register the tool
server.registerTool("voiceToLinkedInPost", {
  description: "Convert voice note into LinkedIn post",
  inputSchema: {
    filePath: z.string().describe("Path to the audio file"),
  },
}, async (args) => {
  try {
    const { filePath } = args;
    console.error(`Processing file: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Step 1: Transcription
    console.error("Starting transcription...");
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));
    form.append("model_id", "scribe_v1");

    try {
      const transcriptRes = await axios.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        form,
        {
          headers: {
            ...form.getHeaders(),
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
          },
        }
      );
      console.error("Transcription successful");
      const transcript = transcriptRes.data.text;

      // Step 2: LinkedIn rewrite
      console.error("Starting LinkedIn post generation...");
      const aiRes = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `
Rewrite this into a high-quality LinkedIn post.

Rules:
- Strong hook
- Short paragraphs
- Professional tone
- Slight storytelling
- No emojis
`,
            },
            {
              role: "user",
              content: transcript,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      console.error("LinkedIn post generation successful");
      const post = aiRes.data.choices[0].message.content;

    return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              transcript,
              linkedinPost: post,
            }, null, 2),
          },
        ],
      };
    } catch (apiError) {
      console.error("API Error:", apiError);
      if (axios.isAxiosError(apiError)) {
        const errorData = apiError.response?.data;
        console.error("Error response:", errorData);
        throw new Error(`API Error: ${apiError.response?.status} - ${JSON.stringify(errorData)}`);
      }
      throw apiError;
    }
  } catch (error) {
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
});

/** Fixed graph payload for pasting into flow-viewer (parse / render smoke tests). */
const DEBUG_ECHO_FLOW = {
  name: "debugEcho (MCP test fixture)",
  nodes: [
    {
      id: "webhook_1",
      type: "webhook",
      position: { x: 0, y: 120 },
      data: { label: "Webhook", path: "/api/hook", extraMeta: "ignored-by-viewer" },
    },
    {
      id: "agent_1",
      type: "agent",
      position: { x: 280, y: 100 },
      data: {
        label: "Agent — summarize",
        model: "gpt-4o-mini",
        notes: JSON.stringify({ nested: true, from: "mcp" }),
      },
    },
    {
      id: "mutation_1",
      type: "mutation",
      position: { x: 560, y: 120 },
      data: { label: "Save to DB", collection: "posts" },
    },
    {
      id: "return_1",
      type: "return",
      position: { x: 820, y: 120 },
      data: { label: "Return response" },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "webhook_1",
      target: "agent_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
    {
      id: "e2",
      source: "agent_1",
      target: "mutation_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
    {
      id: "e3",
      source: "mutation_1",
      target: "return_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
  ],
};

server.registerTool(
  "debugEcho",
  {
    description:
      "Returns sample flow JSON (nodes, edges) for testing flow-viewer paste/parse. No side effects.",
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(DEBUG_ECHO_FLOW, null, 2),
      },
    ],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Voice LinkedIn MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
