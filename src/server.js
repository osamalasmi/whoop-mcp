// MCP-server voor Claude Desktop (stdio).
// Let op: gebruik nooit console.log hier, dat breekt het protocol. Gebruik console.error.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { whoop } from "./whoop.js";
import * as format from "./format.js";

const server = new McpServer({ name: "whoop", version: "1.1.0" });

const days = z
  .number()
  .int()
  .min(1)
  .max(90)
  .default(7)
  .describe("Number of days to look back (1-90, default 7)");

// Compacte JSON (zonder inspringing) scheelt tokens.
function asText(data) {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

async function safe(fn) {
  try {
    return asText(await fn());
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: String(err.message || err) }] };
  }
}

const recovery = async (n) => (await whoop.recovery(n)).map(format.recovery);
const sleep = async (n) => (await whoop.sleep(n)).map(format.sleep);
const strain = async (n) => (await whoop.cycles(n)).map(format.cycle);
const workouts = async (n) => (await whoop.workouts(n)).map(format.workout);

server.registerTool(
  "get_profile",
  { description: "WHOOP profile and body measurements (height, weight, max heart rate)." },
  () =>
    safe(async () => {
      const [profile, body] = await Promise.all([whoop.profile(), whoop.body()]);
      return format.profile(profile, body);
    })
);

server.registerTool(
  "get_recovery",
  {
    description:
      "Daily recovery: recovery %, HRV (rmssd, ms), resting heart rate, SpO2, skin temperature.",
    inputSchema: { days },
  },
  ({ days }) => safe(() => recovery(days))
);

server.registerTool(
  "get_sleep",
  {
    description:
      "Sleep per night: bedtime/wake time (local), hours asleep, light/deep/REM, sleep needed, performance, efficiency, consistency, respiratory rate.",
    inputSchema: { days },
  },
  ({ days }) => safe(() => sleep(days))
);

server.registerTool(
  "get_strain",
  {
    description: "Daily strain: strain score, calories (kcal), average and max heart rate.",
    inputSchema: { days },
  },
  ({ days }) => safe(() => strain(days))
);

server.registerTool(
  "get_workouts",
  {
    description:
      "Workouts: sport, start time, duration, strain, calories, distance, minutes in heart rate zones 0-5.",
    inputSchema: { days },
  },
  ({ days }) => safe(() => workouts(days))
);

server.registerTool(
  "get_overview",
  {
    description:
      "Recovery, sleep, strain and workouts in one call. Best starting point for trends and health advice.",
    inputSchema: { days },
  },
  ({ days }) =>
    safe(async () => {
      const [rec, slp, str, wrk] = await Promise.all([
        recovery(days),
        sleep(days),
        strain(days),
        workouts(days),
      ]);
      return { days, recovery: rec, sleep: slp, strain: str, workouts: wrk };
    })
);

await server.connect(new StdioServerTransport());
console.error("WHOOP MCP-server draait");
