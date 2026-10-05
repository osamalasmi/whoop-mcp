import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Paden relatief aan de projectmap, zodat het ook werkt als Claude Desktop
// de server vanuit een andere map start.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const TOKENS_PATH = path.join(ROOT, "tokens.json");

dotenv.config({ path: path.join(ROOT, ".env"), quiet: true });

export const CLIENT_ID = process.env.WHOOP_CLIENT_ID;
export const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
export const REDIRECT_URI =
  process.env.WHOOP_REDIRECT_URI || "http://localhost:3000/callback";

export const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
export const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
export const API_BASE = "https://api.prod.whoop.com/developer";

export const SCOPES = [
  "offline",
  "read:recovery",
  "read:sleep",
  "read:cycles",
  "read:workout",
  "read:profile",
  "read:body_measurement",
].join(" ");

// Niet meteen afsluiten: dan toont Claude Desktop alleen "server disconnected".
// De tools geven deze melding terug, zodat je ziet wat er mis is.
export const CONFIG_ERROR =
  !CLIENT_ID || !CLIENT_SECRET
    ? `WHOOP_CLIENT_ID of WHOOP_CLIENT_SECRET ontbreekt in ${path.join(ROOT, ".env")}`
    : null;
