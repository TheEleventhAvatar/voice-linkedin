# Convex MCP (beta)

Build a stateless MCP endpoint on top of Convex.

## Features

- **Tools** - Register Convex functions as MCP tools
- **Prompts** - Define MCP prompts with Zod args
- **Resources** - Expose static and templated MCP resources from Convex functions
- **Auth** - Optional Bearer auth on `/mcp`

Note: It does not currently support prompt/resource completions or SSE/session transports.

## Quick Start

```ts
// convex/vibeflow_mcp.ts
import { api, internal } from "./_generated/api";
import {
  assistantText,
  defineMcpServer,
  jsonResource,
  prompt,
  promptResult,
  resource,
  resourceTemplate,
  textResource,
  tool,
  userText,
} from "convex-mcp";

export const mcp = defineMcpServer({
  name: "vibeflow",
  version: "0.1.0",
  tools: {
    users: {
      get: tool(api.users.get, {
        kind: "query",
        description: "Fetch a user by id",
        args: (z) => ({
          userId: z.string().describe("The user id to fetch"),
        }),
      }),
    },
    reports: {
      preview: tool(internal.reports.preview, {
        kind: "action",
        args: (z) => ({
          payload: z.any(),
        }),
      }),
    },
  },
  prompts: {
    onboarding: prompt(
      {
        description: "Generate an onboarding prompt",
        args: (z) => ({
          name: z.string().describe("The user's display name"),
          tone: z.enum(["friendly", "formal"]).optional(),
        }),
      },
      async ({ name, tone }) =>
        promptResult([
          assistantText(`You are onboarding ${name}.`),
          userText(`Say hello in a ${tone ?? "friendly"} tone.`),
        ]),
    ),
  },
  resources: {
    config: resource(api.resources.config, {
      kind: "query",
      uri: "config://application",
      description: "Current application config",
      mimeType: "application/json",
    }),
  },
  resourceTemplates: {
    files: {
      byId: resourceTemplate(api.files.byId, {
        kind: "query",
        uriTemplate: "file://{fileId}",
        description: "Read a file by id",
        mimeType: "text/plain",
        params: (z) => ({
          fileId: z.string().describe("The file id to load"),
        }),
      }),
    },
  },
});
```

And the referenced Convex functions can return resource helpers:

```ts
// convex/resources.ts
import { query } from "./_generated/server";
import { v } from "convex/values";
import { jsonResource, textResource } from "convex-mcp";

export const config = query({
  args: {},
  handler: async () =>
    jsonResource({
      version: "1.0.0",
      features: ["auth", "api", "ui"],
    }),
});

export const byId = query({
  args: { fileId: v.string() },
  handler: async (_ctx, { fileId }) =>
    textResource(`Contents for ${fileId}`),
});
```

Mount it in `convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { mcp } from "./vibeflow_mcp";
import { bearerAuth } from "convex-mcp";

const http = httpRouter();

auth.addHttpRoutes(http);
mcp.addHttpRoutes(http, {
  auth: bearerAuth({
    env: "MCP_AUTH_TOKEN",
    optional: true,
  }),
});

export default http;
```

## Tools

`tool(...)` expects `api/internal` refs only. Both `kind` and `args` are required.

Tool names come from the object shape you pass:

```ts
tools: {
  users: {
    get: tool(api.users.get, {
      kind: "query",
      args: (z) => ({
        userId: z.string(),
      }),
    }),
  },
}
```

This becomes the MCP tool name `users.get`.

Since `api/internal` refs do not expose Convex validator metadata, you need to define the MCP input schema yourself.

You can use callback style:

```ts
tool(api.users.get, {
  kind: "query",
  args: (z) => ({
    userId: z.string().describe("The user id to fetch"),
  }),
})
```

or object style:

```ts
import { z } from "zod";

tool(api.users.get, {
  kind: "query",
  args: {
    userId: z.string(),
  },
})
```

Note: `z.any()` is supported. Query tools get `readOnlyHint: true` automatically unless you override it.

## Prompts

You can define prompts with Zod args. The handler runs inside the MCP layer, not through Convex execution.

```ts
prompt(
  {
    description: "Generate a prompt",
    args: (z) => ({
      name: z.string().describe("The user's display name"),
      tone: z.enum(["friendly", "formal"]).optional(),
    }),
  },
  async ({ name, tone }) => {
    return promptResult([
      assistantText(`You are helping ${name}.`),
      userText(`Respond in a ${tone ?? "friendly"} tone.`),
    ]);
  },
)
```

Prompt handlers can also return a single `PromptMessage` or an array of messages directly.

### Prompt Helpers

| Helper | Description |
|--------|-------------|
| `promptResult(messages, description?)` | Wrap messages into a prompt result |
| `promptMessage(role, content)` | Create a prompt message |
| `assistantText(text)` | Create an assistant text message |
| `userText(text)` | Create a user text message |
| `textContent(text)` | Create a text content block |

## Resources

Use `resource(...)` for fixed URIs and `resourceTemplate(...)` when the URI carries parameters.

```ts
resources: {
  config: resource(api.resources.config, {
    kind: "query",
    uri: "config://application",
    mimeType: "application/json",
  }),
},
resourceTemplates: {
  files: {
    byId: resourceTemplate(api.files.byId, {
      kind: "query",
      uriTemplate: "file://{fileId}",
      mimeType: "text/plain",
      params: (z) => ({
        fileId: z.string(),
      }),
    }),
  },
}
```

Notes:

- Static resources do not accept client args; the Convex function is called with `{}`.
- Resource templates parse params from the requested URI and pass them to your Convex function.
- `resourceTemplate(..., { params })` is optional. If you omit it, template variables default to `z.string()`.
- `kind` is limited to `"query"` or `"action"` for resources.

### Resource Helpers

| Helper | Description |
|--------|-------------|
| `textResource(text, options?)` | Create a text resource content item |
| `jsonResource(value, options?)` | Create a JSON resource content item |
| `blobResource(base64, mimeType, options?)` | Create a binary resource content item |
| `resourceResult(...contents)` | Return multiple resource content items |

## Auth

```ts
auth: bearerAuth({
  env: "MCP_AUTH_TOKEN",
  optional: true,
})
```

- If the env var is unset, auth is disabled
- If the env var is set, requests must send `Authorization: Bearer <token>`
- Auth is enforced before any tool runs

## API

| Function | Description |
|----------|-------------|
| `defineMcpServer(...)` | Builds a tools/prompts/resources catalog |
| `tool(api.foo.bar, { kind, args, ... })` | Registers a Convex function ref as an MCP tool |
| `prompt({ args?, ... }, handler)` | Registers an MCP prompt |
| `resource(api.foo.bar, { kind, uri, ... })` | Registers a fixed MCP resource |
| `resourceTemplate(api.foo.bar, { kind, uriTemplate, ... })` | Registers a templated MCP resource |
| `mcp.addHttpRoutes(http, { path?, auth? })` | Mounts `POST /mcp` on an existing Convex router |
| `mcp.mcpHttp({ auth? })` | Returns the low-level HTTP handler if you want to mount it yourself |
| `bearerAuth(...)` | Adds optional env-backed Bearer auth at the HTTP boundary |
