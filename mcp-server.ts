import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Voice LinkedIn MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
