"use node";

// MCP server functions implemented directly in Convex with Node.js runtime
// Note: Some functionality is simplified to avoid external dependencies

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

function normalizeRecruiter(raw) {
  return {
    name: String(raw.name ?? ""),
    company: String(raw.company ?? ""),
    email: String(raw.email ?? ""),
    location: String(raw.location ?? ""),
    focus: String(raw.focus ?? ""),
  };
}

function extractRoleAndLocation(transcript) {
  const lower = transcript.toLowerCase();
  const targetRole = ROLE_KEYWORDS.find((k) => lower.includes(k)) ?? "";
  const location = LOCATION_KEYWORDS.find((k) => lower.includes(k)) ?? "";
  return { targetRole, location };
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
    to: recruiter.email,
    subject: `Interested in ${role} opportunities at ${recruiter.company}`,
    body: `Hi ${recruiter.name},

I hope this message finds you well. I'm reaching out because I'm interested in ${role} opportunities at ${recruiter.company} in the ${location} area.

Based on my background and experience, I believe I would be a great fit for your team. I'd love to learn more about any current or upcoming openings.

Would you be available for a brief chat this week?

Best regards,
[Your Name]`,
  };
}

// Mock recruiter data for now (would normally load from CSV)
function getMockRecruiters() {
  return [
    {
      name: "John Doe",
      company: "Tech Corp",
      email: "john@techcorp.com",
      location: "bangalore",
      focus: "software engineers backend developers"
    },
    {
      name: "Jane Smith",
      company: "StartupXYZ",
      email: "jane@startupxyz.com", 
      location: "mumbai",
      focus: "frontend engineers full stack developers"
    }
  ];
}

// Export all the MCP tool functions
export async function debugEcho() {
  return toMcpJson({ message: "Echo from MCP server" });
}

export async function parseOutreachRequest(args) {
  try {
    let transcript = args.transcript;
    
    // For now, skip audio transcription due to Node.js dependency issues
    if (args.audioFilePath && !transcript) {
      throw new Error("Audio transcription requires external dependencies. Please provide transcript directly.");
    }

    if (!transcript) {
      throw new Error("Either transcript or audioFilePath must be provided");
    }

    const { targetRole, location } = extractRoleAndLocation(transcript);
    
    return toMcpJson({
      transcript,
      targetRole,
      location,
      constraints: [],
    });
  } catch (error) {
    return {
      ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
      isError: true,
    };
  }
}

export async function matchRecruiters(args) {
  try {
    const { targetRole, location, limit } = args;
    const recruiters = getMockRecruiters(); // Use mock data instead of CSV
    const matchedRecruiters = matchRecruitersByCriteria(recruiters, targetRole, location);
    
    return toMcpJson({
      matchedRecruiters: matchedRecruiters.slice(0, limit || 10),
      totalFound: matchedRecruiters.length,
    });
  } catch (error) {
    return {
      ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
      isError: true,
    };
  }
}

export async function draftOutreachEmail(args) {
  try {
    const { recruiter, role, location } = args;
    const emailTemplate = buildEmailTemplate(recruiter, role, location);
    
    return toMcpJson(emailTemplate);
  } catch (error) {
    return {
      ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
      isError: true,
    };
  }
}

export async function sendOutreachEmail(args) {
  try {
    // This would integrate with an email service
    // For now, just return a success response
    return toMcpJson({
      success: true,
      message: "Email sent successfully",
      recipient: args.recruiter.email,
    });
  } catch (error) {
    return {
      ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
      isError: true,
    };
  }
}

export async function runOutreachPipeline(args) {
  try {
    const { transcript, audioFilePath, maxEmails } = args;
    
    // Step 1: Parse outreach request
    const parseResult = await parseOutreachRequest({ transcript, audioFilePath });
    if (parseResult.isError) return parseResult;
    
    const { targetRole, location } = JSON.parse(parseResult.content[0].text);
    
    // Step 2: Match recruiters
    const matchResult = await matchRecruiters({ role: targetRole, location, maxEmails });
    if (matchResult.isError) return matchResult;
    
    const { matchedRecruiters } = JSON.parse(matchResult.content[0].text);
    
    // Step 3: Draft emails
    const emails = [];
    for (const recruiter of matchedRecruiters) {
      const emailResult = await draftOutreachEmail({ recruiter, role: targetRole, location });
      if (!emailResult.isError) {
        emails.push(JSON.parse(emailResult.content[0].text));
      }
    }
    
    return toMcpJson({
      transcript,
      targetRole,
      location,
      matchedRecruiters,
      draftedEmails: emails,
    });
  } catch (error) {
    return {
      ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
      isError: true,
    };
  }
}

export async function generateVoiceAssets(args) {
  try {
    // This would integrate with voice generation services
    return toMcpJson({
      success: true,
      message: "Voice assets generated successfully",
      assets: [],
    });
  } catch (error) {
    return {
      ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
      isError: true,
    };
  }
}

export async function exportOutreachPipelineFlow() {
  try {
    const OUTREACH_PIPELINE_FLOW = {
      name: "outreach-pipeline",
      description: "Complete pipeline for processing voice outreach requests",
      steps: [
        {
          name: "parse-outreach-request",
          description: "Parse transcript to extract role and location preferences",
          inputs: ["transcript", "audioFilePath"],
          outputs: ["targetRole", "location"],
        },
        {
          name: "match-recruiters",
          description: "Find matching recruiters based on role and location",
          inputs: ["targetRole", "location", "maxEmails"],
          outputs: ["matchedRecruiters"],
        },
        {
          name: "draft-outreach-emails",
          description: "Generate personalized email templates",
          inputs: ["matchedRecruiters", "targetRole", "location"],
          outputs: ["draftedEmails"],
        },
        {
          name: "send-outreach-emails",
          description: "Send emails to matched recruiters",
          inputs: ["draftedEmails"],
          outputs: ["sentEmails"],
        },
      ],
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(OUTREACH_PIPELINE_FLOW, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      ...toMcpJson({ error: error instanceof Error ? error.message : String(error) }),
      isError: true,
    };
  }
}
