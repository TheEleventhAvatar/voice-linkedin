import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import FormData from "form-data";
import csv from "csvtojson";
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

type Recruiter = {
  name: string;
  company: string;
  email: string;
  location: string;
  focus: string;
};

const ROLE_KEYWORDS = [
  "sde interns",
  "interns",
  "internship",
  "intern",
  "backend engineers",
  "backend developer",
  "backend",
  "frontend engineers",
  "frontend developer",
  "frontend",
  "full stack developers",
  "full stack",
  "fullstack",
  "software engineers",
  "software engineer",
  "sde",
  "product engineers",
  "product engineer",
  "data engineers",
  "data engineer",
  "data analysts",
  "data analyst",
  "ml engineers",
  "machine learning",
  "ml",
];

const LOCATION_KEYWORDS = [
  "bangalore",
  "bengaluru",
  "gurgaon",
  "delhi ncr",
  "mumbai",
  "chennai",
  "noida",
  "hyderabad",
  "pune",
];

function toMcpJson(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function normalizeRecruiter(raw: Record<string, unknown>): Recruiter {
  return {
    name: String(raw.name ?? ""),
    company: String(raw.company ?? ""),
    email: String(raw.email ?? ""),
    location: String(raw.location ?? ""),
    focus: String(raw.focus ?? ""),
  };
}

async function loadRecruiters(): Promise<Recruiter[]> {
  const rows = await csv().fromFile(path.join(process.cwd(), "recuriters.csv"));
  return rows.map(normalizeRecruiter);
}

function extractRoleAndLocation(transcript: string) {
  const lower = transcript.toLowerCase();
  const targetRole = ROLE_KEYWORDS.find((k) => lower.includes(k)) ?? "";
  const location = LOCATION_KEYWORDS.find((k) => lower.includes(k)) ?? "";
  return { targetRole, location };
}

function matchRecruitersByCriteria(
  recruiters: Recruiter[],
  role: string,
  location: string
) {
  return recruiters.filter((r) => {
    const focus = r.focus.toLowerCase();
    const recruiterLocation = r.location.toLowerCase();
    return focus.includes(role.toLowerCase()) && recruiterLocation.includes(location.toLowerCase());
  });
}

async function transcribeAudio(filePath: string): Promise<string> {
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

function buildEmailTemplate(recruiter: Recruiter, role: string, location: string) {
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

async function sendViaAgentmail(args: {
  inboxId: string;
  to: string;
  subject: string;
  body: string;
}) {
  if (!process.env.AGENTMAIL_API_KEY) {
    throw new Error("AGENTMAIL_API_KEY not configured in .env");
  }
  const response = await axios.post(
    `https://api.agentmail.to/v0/inboxes/${args.inboxId}/messages/send`,
    {
      to: args.to,
      subject: args.subject,
      text: args.body,
      html: args.body.replace(/\n/g, "<br>"),
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

type ExecutionStep = {
  nodeId: string;
  label: string;
  status: "success" | "failed" | "skipped";
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
  output?: unknown;
};

function nowIso() {
  return new Date().toISOString();
}

function durationMs(startMs: number) {
  return Date.now() - startMs;
}

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

server.registerTool(
  "parseOutreachRequest",
  {
    description:
      "Parse outreach intent from transcript or audio. Returns transcript, target role, location, and constraints.",
    inputSchema: {
      transcript: z.string().optional().describe("Optional plain-text transcript"),
      audioFilePath: z.string().optional().describe("Optional audio path to transcribe"),
      maxEmails: z.number().optional().describe("Optional cap for downstream send step"),
    },
  },
  async (args) => {
    try {
      const transcript =
        args.transcript && args.transcript.trim().length > 0
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

      return toMcpJson({
        transcript,
        targetRole,
        location,
        constraints,
      });
    } catch (error) {
      return {
        ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
        isError: true,
      };
    }
  }
);

server.registerTool(
  "generateVoiceAssets",
  {
    description:
      "Generate reusable outreach voice assets (pitch and speaking script) from parsed intent.",
    inputSchema: {
      transcript: z.string().describe("Source transcript"),
      targetRole: z.string().optional().describe("Parsed role target"),
      location: z.string().optional().describe("Parsed location"),
    },
  },
  async (args) => {
    try {
      const aiRes = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Create concise, professional voice outreach assets. Return strict JSON with keys personalizedPitch and audioScript.",
            },
            {
              role: "user",
              content: JSON.stringify({
                transcript: args.transcript,
                targetRole: args.targetRole ?? "",
                location: args.location ?? "",
              }),
            },
          ],
          response_format: { type: "json_object" },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      const parsed = JSON.parse(aiRes.data.choices[0].message.content ?? "{}");
      return toMcpJson({
        personalizedPitch: parsed.personalizedPitch ?? "",
        audioScript: parsed.audioScript ?? "",
        voiceConfig: {
          pace: "medium",
          tone: "professional",
          emphasis: "role-fit and intent clarity",
        },
      });
    } catch (error) {
      return {
        ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
        isError: true,
      };
    }
  }
);

server.registerTool(
  "matchRecruiters",
  {
    description:
      "Match recruiters by role and location using local recruiter dataset.",
    inputSchema: {
      targetRole: z.string().describe("Role target for filtering"),
      location: z.string().describe("Location target for filtering"),
      limit: z.number().optional().describe("Optional max matches to return"),
    },
  },
  async (args) => {
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

      return toMcpJson({
        totalMatches: matches.length,
        matchedRecruiters: limited,
        scoreBreakdown,
      });
    } catch (error) {
      return {
        ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
        isError: true,
      };
    }
  }
);

server.registerTool(
  "draftOutreachEmail",
  {
    description:
      "Draft outreach email subject/body for a selected recruiter using parsed intent and optional pitch/script.",
    inputSchema: {
      recruiter: z
        .object({
          name: z.string(),
          company: z.string(),
          email: z.string(),
          location: z.string(),
          focus: z.string(),
        })
        .describe("Selected recruiter object"),
      targetRole: z.string().describe("Role target"),
      location: z.string().describe("Location target"),
      personalizedPitch: z.string().optional().describe("Optional generated pitch text"),
      audioScript: z.string().optional().describe("Optional generated script text"),
    },
  },
  async (args) => {
    try {
      const baseTemplate = buildEmailTemplate(args.recruiter, args.targetRole, args.location);
      const enrichedBody =
        args.personalizedPitch || args.audioScript
          ? `${baseTemplate.body}

---
Personalized context:
${args.personalizedPitch ?? ""}
${args.audioScript ? `\n\nVoice script summary:\n${args.audioScript}` : ""}`
          : baseTemplate.body;

      return toMcpJson({
        recruiter: args.recruiter,
        emailSubject: baseTemplate.subject,
        emailBody: enrichedBody,
      });
    } catch (error) {
      return {
        ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
        isError: true,
      };
    }
  }
);

server.registerTool(
  "sendOutreachEmail",
  {
    description:
      "Send a drafted outreach email through AgentMail and return send status.",
    inputSchema: {
      inboxId: z.string().describe("AgentMail inbox ID"),
      toEmail: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      body: z.string().describe("Email body"),
      dryRun: z.boolean().optional().describe("If true, skips actual send"),
    },
  },
  async (args) => {
    try {
      if (args.dryRun ?? false) {
        return toMcpJson({
          success: true,
          dryRun: true,
          toEmail: args.toEmail,
          subject: args.subject,
        });
      }

      const result = await sendViaAgentmail({
        inboxId: args.inboxId,
        to: args.toEmail,
        subject: args.subject,
        body: args.body,
      });

      return toMcpJson({
        success: true,
        dryRun: false,
        toEmail: args.toEmail,
        messageId: result.id ?? null,
        providerResponse: result,
      });
    } catch (error) {
      return {
        ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
        isError: true,
      };
    }
  }
);

export async function runOutreachPipeline(args: {
  transcript?: string;
  audioFilePath?: string;
  inboxId?: string;
  dryRun?: boolean;
  maxEmails?: number;
  includeFlow?: boolean;
}) {
    const runId = `run_${Date.now()}`;
    const runStartMs = Date.now();
    const startedAt = nowIso();
    const steps: ExecutionStep[] = [];
    const dryRun = args.dryRun ?? true;
    const maxEmails = args.maxEmails ?? 3;

    try {
      // parse_1
      const parseStart = Date.now();
      const parseStartedAt = nowIso();
      let transcript = "";
      if (args.transcript && args.transcript.trim().length > 0) {
        transcript = args.transcript.trim();
      } else if (args.audioFilePath) {
        transcript = await transcribeAudio(args.audioFilePath);
      } else {
        throw new Error("Provide either transcript or audioFilePath");
      }
      const { targetRole, location } = extractRoleAndLocation(transcript);
      const parseOutput = { transcript, targetRole, location, constraints: { maxEmails } };
      steps.push({
        nodeId: "parse_1",
        label: "Parse Outreach Intent",
        status: "success",
        startedAt: parseStartedAt,
        finishedAt: nowIso(),
        durationMs: durationMs(parseStart),
        output: parseOutput,
      });

      // voice_1
      const voiceStart = Date.now();
      const voiceStartedAt = nowIso();
      const voiceRes = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Create concise, professional voice outreach assets. Return strict JSON with keys personalizedPitch and audioScript.",
            },
            {
              role: "user",
              content: JSON.stringify({ transcript, targetRole, location }),
            },
          ],
          response_format: { type: "json_object" },
        },
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        }
      );
      const voiceParsed = JSON.parse(voiceRes.data.choices[0].message.content ?? "{}");
      const voiceOutput = {
        personalizedPitch: String(voiceParsed.personalizedPitch ?? ""),
        audioScript: String(voiceParsed.audioScript ?? ""),
        voiceConfig: { pace: "medium", tone: "professional" },
      };
      steps.push({
        nodeId: "voice_1",
        label: "Generate Voice Assets",
        status: "success",
        startedAt: voiceStartedAt,
        finishedAt: nowIso(),
        durationMs: durationMs(voiceStart),
        output: voiceOutput,
      });

      // match_1
      const matchStart = Date.now();
      const matchStartedAt = nowIso();
      const recruiters = await loadRecruiters();
      const matches = matchRecruitersByCriteria(recruiters, targetRole, location);
      const selected = matches.slice(0, maxEmails);
      const matchOutput = {
        totalMatches: matches.length,
        selectedCount: selected.length,
        matchedRecruiters: selected,
      };
      steps.push({
        nodeId: "match_1",
        label: "Match Recruiters",
        status: "success",
        startedAt: matchStartedAt,
        finishedAt: nowIso(),
        durationMs: durationMs(matchStart),
        output: matchOutput,
      });

      // draft_1
      const draftStart = Date.now();
      const draftStartedAt = nowIso();
      const drafts = selected.map((recruiter) => {
        const template = buildEmailTemplate(recruiter, targetRole, location);
        const emailBody = `${template.body}

---
Personalized context:
${voiceOutput.personalizedPitch}
${voiceOutput.audioScript ? `\n\nVoice script summary:\n${voiceOutput.audioScript}` : ""}`;
        return {
          recruiter,
          emailSubject: template.subject,
          emailBody,
        };
      });
      steps.push({
        nodeId: "draft_1",
        label: "Draft Outreach Email",
        status: "success",
        startedAt: draftStartedAt,
        finishedAt: nowIso(),
        durationMs: durationMs(draftStart),
        output: { draftsCount: drafts.length, drafts },
      });

      // send_1
      const sendStart = Date.now();
      const sendStartedAt = nowIso();
      if (!dryRun && !args.inboxId) {
        throw new Error("inboxId is required when dryRun is false");
      }
      const sendResults: Array<Record<string, unknown>> = [];
      for (const draft of drafts) {
        if (dryRun) {
          sendResults.push({
            success: true,
            dryRun: true,
            toEmail: draft.recruiter.email,
            subject: draft.emailSubject,
          });
          continue;
        }
        try {
          const providerResponse = await sendViaAgentmail({
            inboxId: args.inboxId as string,
            to: draft.recruiter.email,
            subject: draft.emailSubject,
            body: draft.emailBody,
          });
          sendResults.push({
            success: true,
            dryRun: false,
            toEmail: draft.recruiter.email,
            messageId: providerResponse.id ?? null,
          });
        } catch (error) {
          sendResults.push({
            success: false,
            dryRun: false,
            toEmail: draft.recruiter.email,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      steps.push({
        nodeId: "send_1",
        label: "Send Email",
        status: sendResults.some((r) => r.success === false) ? "failed" : "success",
        startedAt: sendStartedAt,
        finishedAt: nowIso(),
        durationMs: durationMs(sendStart),
        output: { dryRun, sendResults },
      });

      // return_1
      steps.push({
        nodeId: "return_1",
        label: "Return Pipeline Result",
        status: "success",
        startedAt: nowIso(),
        finishedAt: nowIso(),
        durationMs: 0,
      });

      const failed = steps.some((s) => s.status === "failed");
      const response = {
        runId,
        status: failed ? "failed" : "success",
        startedAt,
        finishedAt: nowIso(),
        durationMs: durationMs(runStartMs),
        execution: { runId, status: failed ? "failed" : "success", startedAt, finishedAt: nowIso(), steps },
        result: {
          transcript,
          targetRole,
          location,
          matchedCount: selected.length,
          dryRun,
        },
        flow: args.includeFlow ? OUTREACH_PIPELINE_FLOW : undefined,
      };
      return toMcpJson(response);
    } catch (error) {
      steps.push({
        nodeId: "return_1",
        label: "Return Pipeline Result",
        status: "skipped",
        error: "Upstream failure",
      });
      return {
        ...toMcpJson({
          runId,
          status: "failed",
          startedAt,
          finishedAt: nowIso(),
          durationMs: durationMs(runStartMs),
          execution: {
            runId,
            status: "failed",
            startedAt,
            finishedAt: nowIso(),
            steps,
          },
          error: error instanceof Error ? error.message : String(error),
        }),
        isError: true,
      };
    }
  }
}

server.registerTool(
  "runOutreachPipeline",
  {
    description:
      "Run the complete modular outreach pipeline and return VibeFlow-style execution steps.",
    inputSchema: {
      transcript: z.string().optional().describe("Optional transcript text"),
      audioFilePath: z.string().optional().describe("Optional audio path for transcription"),
      inboxId: z.string().optional().describe("AgentMail inbox ID (required when dryRun is false)"),
      dryRun: z.boolean().optional().describe("If true, skip sending emails"),
      maxEmails: z.number().optional().describe("Max matched recruiters to send to"),
      includeFlow: z.boolean().optional().describe("Include flow graph in the response"),
    },
  },
  runOutreachPipeline
);

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

/** Outreach voice pipeline as modular VibeFlow graph (debug/iteration fixture). */
const OUTREACH_PIPELINE_FLOW = {
  name: "Voice Outreach Pipeline (modular nodes)",
  nodes: [
    {
      id: "webhook_1",
      type: "webhook",
      position: { x: 0, y: 240 },
      data: {
        label: "Pipeline Trigger",
        path: "/api/outreach/voice",
      },
    },
    {
      id: "parse_1",
      type: "agent",
      position: { x: 260, y: 80 },
      data: {
        label: "Parse Outreach Intent",
        model: "gpt-4o-mini",
        toolName: "parseOutreachRequest",
        output: ["transcript", "targetRole", "location", "constraints"],
      },
    },
    {
      id: "voice_1",
      type: "agent",
      position: { x: 260, y: 250 },
      data: {
        label: "Generate Voice Assets",
        model: "gpt-4o-mini",
        toolName: "generateVoiceAssets",
        output: ["personalizedPitch", "audioScript", "voiceConfig"],
      },
    },
    {
      id: "match_1",
      type: "agent",
      position: { x: 520, y: 80 },
      data: {
        label: "Match Recruiters",
        model: "gpt-4o-mini",
        toolName: "matchRecruiters",
        output: ["matchedRecruiters", "scoreBreakdown"],
      },
    },
    {
      id: "draft_1",
      type: "agent",
      position: { x: 520, y: 250 },
      data: {
        label: "Draft Outreach Email",
        model: "gpt-4o-mini",
        toolName: "draftOutreachEmail",
        output: ["emailSubject", "emailBody"],
      },
    },
    {
      id: "send_1",
      type: "mutation",
      position: { x: 800, y: 180 },
      data: {
        label: "Send Email",
        toolName: "sendOutreachEmail",
        provider: "agentmail",
      },
    },
    {
      id: "return_1",
      type: "return",
      position: { x: 1060, y: 180 },
      data: {
        label: "Return Pipeline Result",
      },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "webhook_1",
      target: "parse_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
    {
      id: "e2",
      source: "webhook_1",
      target: "voice_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
    {
      id: "e3",
      source: "parse_1",
      target: "match_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
    {
      id: "e4",
      source: "voice_1",
      target: "draft_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
    {
      id: "e5",
      source: "match_1",
      target: "draft_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
    {
      id: "e6",
      source: "draft_1",
      target: "send_1",
      sourceHandle: "output",
      targetHandle: "input",
    },
    {
      id: "e7",
      source: "send_1",
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

server.registerTool(
  "exportOutreachPipelineFlow",
  {
    description:
      "Returns VibeFlow-compatible outreach pipeline JSON with modular parsing, voice generation, matching, and email-send nodes.",
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(OUTREACH_PIPELINE_FLOW, null, 2),
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
