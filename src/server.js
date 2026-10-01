// MCP-server voor Claude Desktop (stdio).
// Let op: gebruik nooit console.log hier, dat breekt het protocol. Gebruik console.error.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { whoop } from "./whoop.js";

const server = new McpServer({ name: "whoop", version: "1.0.0" });

const days = z
  .number()
  .int()
  .min(1)
  .max(90)
  .default(7)
  .describe("Aantal dagen terug (1-90, standaard 7)");

function asText(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

async function safe(fn) {
  try {
    return asText(await fn());
  } catch (err) {
    return { isError: true, content: [{ type: "text", text: String(err.message || err) }] };
  }
}

server.tool(
  "get_profile",
  "WHOOP-profiel en lichaamsmaten (lengte, gewicht, max hartslag).",
  {},
  () => safe(async () => ({ profile: await whoop.profile(), body: await whoop.body() }))
);

server.tool(
  "get_recovery",
  "Recovery-scores per dag: recovery %, HRV (rmssd), rusthartslag, SpO2, huidtemperatuur.",
  { days },
  ({ days }) => safe(() => whoop.recovery(days))
);

server.tool(
  "get_sleep",
  "Slaapdata: duur, slaapfases (licht/diep/REM), efficiëntie, performance, ademhaling.",
  { days },
  ({ days }) => safe(() => whoop.sleep(days))
);

server.tool(
  "get_strain",
  "Dagelijkse cycles: strain-score, calorieën (kJ), gemiddelde en max hartslag.",
  { days },
  ({ days }) => safe(() => whoop.cycles(days))
);

server.tool(
  "get_workouts",
  "Workouts: sport, duur, strain, hartslagzones, calorieën.",
  { days },
  ({ days }) => safe(() => whoop.workouts(days))
);

server.tool(
  "get_overview",
  "Compleet overzicht van recovery, slaap, strain en workouts in één keer. Handig voor trends en advies.",
  { days },
  ({ days }) =>
    safe(async () => {
      const [recovery, sleep, strain, workouts] = await Promise.all([
        whoop.recovery(days),
        whoop.sleep(days),
        whoop.cycles(days),
        whoop.workouts(days),
      ]);
      return { days, recovery, sleep, strain, workouts };
    })
);

await server.connect(new StdioServerTransport());
console.error("WHOOP MCP-server draait");
