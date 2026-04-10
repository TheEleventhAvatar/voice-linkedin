import { httpRouter } from "convex/server";
import { mcp } from "./mcp";

const http = httpRouter();
mcp.addHttpRoutes(http);

export default http;
