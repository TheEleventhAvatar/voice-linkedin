import { getFunctionName } from "convex/server";
import { describe, expect, it } from "vitest";

import { invokeHttp, makeCtx, mcp } from "./helpers.js";

describe("resources", () => {
  it("handles resources/list and resources/read for static resources", async () => {
    const ctx = makeCtx();
    const handler = mcp.mcpHttp();

    const listResponse = await invokeHttp(
      handler,
      ctx,
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 30,
          method: "resources/list",
          params: {},
        }),
      }),
    );

    expect(listResponse.status).toBe(200);
    const listBody = await listResponse.json();
    expect(listBody.result.resources).toEqual([
      {
        uri: "config://application",
        name: "config",
        title: "Application Config",
        description: "Current application config",
        mimeType: "application/json",
      },
      {
        uri: "text://welcome",
        name: "welcome",
        description: "Welcome text",
        mimeType: "text/plain",
      },
      {
        uri: "report://latest",
        name: "latest.bundle",
        description: "Latest report bundle",
      },
    ]);

    const readResponse = await invokeHttp(
      handler,
      ctx,
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 31,
          method: "resources/read",
          params: {
            uri: "config://application",
          },
        }),
      }),
    );

    expect(readResponse.status).toBe(200);
    expect((await readResponse.json()).result.contents).toEqual([
      {
        uri: "config://application",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            version: "1.0.0",
            features: ["auth", "api", "ui"],
          },
          null,
          2,
        ),
      },
    ]);
  });

  it("handles resources/templates/list and template reads", async () => {
    const ctx = makeCtx();
    const handler = mcp.mcpHttp();

    const listResponse = await invokeHttp(
      handler,
      ctx,
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 32,
          method: "resources/templates/list",
          params: {},
        }),
      }),
    );

    expect(listResponse.status).toBe(200);
    expect((await listResponse.json()).result.resourceTemplates).toEqual([
      {
        name: "files.byId",
        uriTemplate: "file://{fileId}",
        description: "Read a file by id",
        mimeType: "text/plain",
      },
      {
        name: "docs.section",
        uriTemplate: "docs://{slug}",
        description: "Read docs by slug",
        mimeType: "application/json",
      },
    ]);

    const fileResponse = await invokeHttp(
      handler,
      ctx,
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 33,
          method: "resources/read",
          params: {
            uri: "file://abc123",
          },
        }),
      }),
    );

    expect(fileResponse.status).toBe(200);
    expect((await fileResponse.json()).result.contents).toEqual([
      {
        uri: "file://abc123",
        mimeType: "text/plain",
        text: "Contents for abc123",
      },
    ]);
    expect(getFunctionName(ctx.runQuery.mock.calls[0][0])).toBe("files:byId");
    expect(ctx.runQuery.mock.calls[0][1]).toEqual({ fileId: "abc123" });

    const docsResponse = await invokeHttp(
      handler,
      ctx,
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 34,
          method: "resources/read",
          params: {
            uri: "docs://getting-started",
          },
        }),
      }),
    );

    expect(docsResponse.status).toBe(200);
    expect((await docsResponse.json()).result.contents).toEqual([
      {
        uri: "docs://getting-started",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            slug: "getting-started",
            title: "Doc getting-started",
          },
          null,
          2,
        ),
      },
    ]);
  });

  it("supports multi-item resource results", async () => {
    const ctx = makeCtx();
    const handler = mcp.mcpHttp();

    const response = await invokeHttp(
      handler,
      ctx,
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 35,
          method: "resources/read",
          params: {
            uri: "report://latest",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).result.contents).toEqual([
      {
        uri: "report://latest/summary",
        mimeType: "text/plain",
        text: "Executive Summary...",
      },
      {
        uri: "report://latest/data",
        mimeType: "application/json",
        text: JSON.stringify(
          {
            totalReports: 3,
          },
          null,
          2,
        ),
      },
      {
        uri: "report://latest/chart",
        mimeType: "image/png",
        blob: "YWJj",
      },
    ]);
  });
});
