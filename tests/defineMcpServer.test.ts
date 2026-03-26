import { describe, expect, it } from "vitest";

import { mcp } from "./helpers.js";

describe("defineMcpServer", () => {
  it("marks query tools as read-only by default", () => {
    const getTool = mcp.tools.get("users.get");
    expect(getTool?.annotations?.readOnlyHint).toBe(true);
  });

  it("flattens nested tool trees into dot-delimited MCP names", () => {
    expect([...mcp.tools.keys()]).toEqual([
      "users.get",
      "users.create",
      "reports.generate",
      "reports.preview",
    ]);
  });

  it("flattens nested prompt trees into dot-delimited MCP names", () => {
    expect([...mcp.prompts.keys()]).toEqual([
      "onboarding",
      "changelog",
    ]);
  });

  it("flattens nested resource trees into dot-delimited MCP names", () => {
    expect([...mcp.resources.keys()]).toEqual([
      "config",
      "welcome",
      "latest.bundle",
    ]);
  });

  it("flattens nested resource template trees into dot-delimited MCP names", () => {
    expect([...mcp.resourceTemplates.keys()]).toEqual([
      "files.byId",
      "docs.section",
    ]);
  });
});
