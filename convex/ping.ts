// convex/ping.ts
import { action } from "./_generated/server";


export const pingAction = action({
  args: {},
  handler: async () => {
    return "pong";
  },
});