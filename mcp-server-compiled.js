"use node";

// Compiled MCP server functions for Convex integration
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
  // Sample recruiter data for Convex
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

function toMcpJson(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// Export all functions for Convex actions
export { 
  parseOutreachRequest,
  generateVoiceAssets,
  matchRecruiters,
  draftOutreachEmail,
  sendOutreachEmail,
  runOutreachPipeline,
  debugEcho,
  exportOutreachPipelineFlow,
  extractRoleAndLocation,
  transcribeAudio,
  loadRecruiters,
  matchRecruitersByCriteria,
  buildEmailTemplate,
  toMcpJson
};

// Function implementations
async function parseOutreachRequest(args) {
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

async function generateVoiceAssets(args) {
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
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
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

async function matchRecruiters(args) {
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

async function draftOutreachEmail(args) {
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

async function sendOutreachEmail(args) {
  try {
    if (args.dryRun ?? false) {
      return toMcpJson({
        success: true,
        dryRun: true,
        toEmail: args.toEmail,
        subject: args.subject,
      });
    }

    const response = await axios.post(
      `https://api.agentmail.to/v0/inboxes/${args.inboxId}/messages/send`,
      {
        to: args.toEmail,
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
    return toMcpJson({
      success: true,
      dryRun: false,
      toEmail: args.toEmail,
      messageId: response.data.id ?? null,
      providerResponse: response.data,
    });
  } catch (error) {
    return {
      ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
      isError: true,
    };
  }
}

async function runOutreachPipeline(args) {
  const runId = `run_${Date.now()}`;
  const runStartMs = Date.now();
  const startedAt = new Date().toISOString();
  const steps = [];
  const dryRun = args.dryRun ?? true;
  const maxEmails = args.maxEmails ?? 3;

  try {
    // Simplified pipeline for Convex
    const transcript = args.transcript ?? "Sample transcript";
    const { targetRole, location } = extractRoleAndLocation(transcript);
    const recruiters = await loadRecruiters();
    const matches = matchRecruitersByCriteria(recruiters, targetRole, location);
    const selected = matches.slice(0, maxEmails);

    return toMcpJson({
      runId,
      status: "success",
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - runStartMs,
      result: {
        transcript,
        targetRole,
        location,
        matchedCount: selected.length,
        dryRun,
      },
    });
  } catch (error) {
    return {
      ...toMcpJson({
        runId,
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - runStartMs,
        error: error instanceof Error ? error.message : String(error),
      }),
      isError: true,
    };
  }
}

async function debugEcho() {
  const DEBUG_ECHO_FLOW = {
    name: "debugEcho (MCP test fixture)",
    nodes: [
      {
        id: "webhook_1",
        type: "webhook",
        position: { x: 0, y: 120 },
        data: { label: "Webhook", path: "/api/hook" },
      },
      {
        id: "agent_1",
        type: "agent",
        position: { x: 280, y: 100 },
        data: {
          label: "Agent — summarize",
          model: "gpt-4o-mini",
        },
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
        target: "return_1",
        sourceHandle: "output",
        targetHandle: "input",
      },
    ],
  };

  return toMcpJson(DEBUG_ECHO_FLOW);
}

async function exportOutreachPipelineFlow() {
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
          model: "ElevenLabs",
          toolName: "parseOutreachRequest",
          output: ["transcript", "targetRole", "location", "constraints"],
        },
      },
      {
        id: "match_1",
        type: "agent",
        position: { x: 520, y: 80 },
        data: {
          label: "Match Recruiters",
          model: "ElevenLabs",
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
          model: "ElevenLabs",
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
        id: "e3",
        source: "parse_1",
        target: "match_1",
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

  return toMcpJson(OUTREACH_PIPELINE_FLOW);
}
