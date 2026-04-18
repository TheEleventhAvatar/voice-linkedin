/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as debugEcho from "../debugEcho.js";
import type * as draftOutreachEmail from "../draftOutreachEmail.js";
import type * as exportOutreachPipelineFlow from "../exportOutreachPipelineFlow.js";
import type * as generateVoiceAssets from "../generateVoiceAssets.js";
import type * as http from "../http.js";
import type * as matchRecruiters from "../matchRecruiters.js";
import type * as mcp from "../mcp.js";
import type * as mcpNodeWrapper from "../mcpNodeWrapper.js";
import type * as parseOutreachRequest from "../parseOutreachRequest.js";
import type * as ping from "../ping.js";
import type * as runOutreachPipeline from "../runOutreachPipeline.js";
import type * as sendOutreachEmail from "../sendOutreachEmail.js";
import type * as voiceToLinkedInPost from "../voiceToLinkedInPost.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  debugEcho: typeof debugEcho;
  draftOutreachEmail: typeof draftOutreachEmail;
  exportOutreachPipelineFlow: typeof exportOutreachPipelineFlow;
  generateVoiceAssets: typeof generateVoiceAssets;
  http: typeof http;
  matchRecruiters: typeof matchRecruiters;
  mcp: typeof mcp;
  mcpNodeWrapper: typeof mcpNodeWrapper;
  parseOutreachRequest: typeof parseOutreachRequest;
  ping: typeof ping;
  runOutreachPipeline: typeof runOutreachPipeline;
  sendOutreachEmail: typeof sendOutreachEmail;
  voiceToLinkedInPost: typeof voiceToLinkedInPost;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
