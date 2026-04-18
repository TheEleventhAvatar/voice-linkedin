#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Direct MCP server implementation for Convex integration
import axios from "axios";
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const ROLE_KEYWORDS = [
  "sde interns", "interns", "internship", "intern",
  "backend engineers", "backend developer", "backend",
  "frontend engineers", "frontend developer", "frontend",
  "full stack developers", "full stack", "fullstack",
  "software engineers", "software engineer", "sde",
  "product engineers", "product engineer",
  "data engineers", "data engineer",
  "data analysts", "data analyst",
  "ml engineers", "machine learning", "ml",
];

const LOCATION_KEYWORDS = [
  "bangalore", "bengaluru", "gurgaon", "delhi ncr",
  "mumbai", "chennai", "noida", "hyderabad", "pune",
];

function extractRoleAndLocation(transcript) {
  const lower = transcript.toLowerCase();
  const targetRole = ROLE_KEYWORDS.find((k) => lower.includes(k)) ?? "";
  const location = LOCATION_KEYWORDS.find((k) => lower.includes(k)) ?? "";
  return { targetRole, location };
}

async function transcribeAudio(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("model_id", "scribe_v1");
  form.append("language_code", "en");

  const transcriptRes = await axios.post("https://api.elevenlabs.io/v1/speech-to-text", form, {
    headers: {
      ...form.getHeaders(),
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
    },
  });

  return transcriptRes.data.text;
}

async function loadRecruiters() {
  return [
    {
      name: "Aman Sharma",
      company: "Flipkart",
      email: "aman.sharma.hr@gmail.com",
      location: "Bangalore",
      focus: "SDE Interns"
    },
    {
      name: "Karan Malhotra", 
      company: "Swiggy",
      email: "karan.malhotra.hr@gmail.com",
      location: "Bangalore",
      focus: "SDE Interns"
    },
    {
      name: "Anjali Singh",
      company: "Ola", 
      email: "anjali.singh.talent@gmail.com",
      location: "Bangalore",
      focus: "SDE Interns"
    },
    {
      name: "Deepak Chauhan",
      company: "Unacademy",
      email: "deepak.chauhan.hr@gmail.com", 
      location: "Bangalore",
      focus: "SDE Interns"
    }
  ];
}

function matchRecruitersByCriteria(recruiters, role, location) {
  return recruiters.filter((r) => {
    const focus = r.focus.toLowerCase();
    const recruiterLocation = r.location.toLowerCase();
    return focus.includes(role.toLowerCase()) && recruiterLocation.includes(location.toLowerCase());
  });
}

function buildEmailTemplate(recruiter, role, location) {
  return {
    subject: `${role || "Career"} Opportunity - ${location || recruiter.location}`,
    body: `Hi ${recruiter.name},

Hope you are doing well.

I am reaching out because I saw that ${recruiter.company} is hiring for ${role || "engineering roles"} in ${location || recruiter.location}. My background aligns well with this, and I would value a quick conversation to explore fit.

Would you be open to a brief chat this week?

Best regards,
[Your Name]
[Your Contact Info]`,
  };
}

async function main() {
  const transport = new StdioServerTransport();
  
  const server = new Server(
    {
      name: "voice-linkedin-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register voiceToLinkedInPost tool
  await server.registerTool("voiceToLinkedInPost", {
    description: "Convert voice note into LinkedIn post",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the audio file",
        },
      },
      required: ["filePath"],
    },
  }, async (args) => {
    try {
      const { filePath } = args;
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const form = new FormData();
      form.append("file", fs.createReadStream(filePath));
      form.append("model_id", "scribe_v1");

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
    } catch (error) {
      console.error("voiceToLinkedInPost error:", error);
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

  // Register parseOutreachRequest tool
  await server.registerTool("parseOutreachRequest", {
    description: "Parse outreach intent from transcript or audio. Returns transcript, target role, location, and constraints.",
    inputSchema: {
      type: "object",
      properties: {
        transcript: {
          type: "string",
          description: "Optional plain-text transcript",
        },
        audioFilePath: {
          type: "string",
          description: "Optional audio path to transcribe",
        },
        maxEmails: {
          type: "number",
          description: "Optional cap for downstream send step",
        },
      },
    },
  }, async (args) => {
    try {
      const transcript = args.transcript && args.transcript.trim().length > 0
        ? args.transcript.trim()
        : args.audioFilePath
          ? await transcribeAudio(args.audioFilePath)
          : "";

      if (!transcript) {
        throw new Error("Provide either transcript or audioFilePath");
      }

      const { targetRole, location } = extractRoleAndLocation(transcript);
      const constraints = {
        maxEmails: args.maxEmails ?? 3,
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              transcript,
              targetRole,
              location,
              constraints,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("parseOutreachRequest error:", error);
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

  // Register matchRecruiters tool
  await server.registerTool("matchRecruiters", {
    description: "Match recruiters by role and location using local recruiter dataset.",
    inputSchema: {
      type: "object",
      properties: {
        targetRole: {
          type: "string",
          description: "Role target for filtering",
        },
        location: {
          type: "string",
          description: "Location target for filtering",
        },
        limit: {
          type: "number",
          description: "Optional max matches to return",
        },
      },
      required: ["targetRole", "location"],
    },
  }, async (args) => {
    try {
      const recruiters = await loadRecruiters();
      const matches = matchRecruitersByCriteria(recruiters, args.targetRole, args.location);
      const limited = matches.slice(0, args.limit ?? 10);

      const scoreBreakdown = limited.map((r) => ({
        recruiter: r.name,
        company: r.company,
        roleMatch: r.focus.toLowerCase().includes(args.targetRole.toLowerCase()) ? 1 : 0,
        locationMatch: r.location.toLowerCase().includes(args.location.toLowerCase()) ? 1 : 0,
        totalScore:
          (r.focus.toLowerCase().includes(args.targetRole.toLowerCase()) ? 1 : 0) +
          (r.location.toLowerCase().includes(args.location.toLowerCase()) ? 1 : 0),
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              totalMatches: matches.length,
              matchedRecruiters: limited,
              scoreBreakdown,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("matchRecruiters error:", error);
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

  // Register ping tool
  await server.registerTool("ping", {
    description: "test tool",
    inputSchema: {
      type: "object",
      properties: {},
    },
  }, async (args) => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            message: "pong",
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  });

  await server.connect(transport);
  console.error("Voice LinkedIn MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
