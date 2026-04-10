"use node";

import { action } from "./_generated/server.js";
import { v } from "convex/values";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

export const voiceToLinkedInPostAction = action({
  args: {
    filePath: v.string(),
  },
  handler: async (_, args) => {
        //  Step 1: Transcription
        const form = new FormData();
        form.append("file", fs.createReadStream(args.filePath));

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

        const transcript = transcriptRes.data.text;

        //  Step 2: LinkedIn rewrite
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

        const post = aiRes.data.choices[0].message.content;

        return {
          transcript,
          linkedinPost: post,
        };
      },
    });
