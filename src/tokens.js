import fs from "node:fs";
import { TOKENS_PATH, TOKEN_URL, CLIENT_ID, CLIENT_SECRET } from "./config.js";

export function saveTokens(data) {
  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    // 60 seconden marge zodat we op tijd verversen
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  return tokens;
}

function loadTokens() {
  if (!fs.existsSync(TOKENS_PATH)) {
    throw new Error("Geen tokens.json gevonden. Draai eerst `npm run auth`.");
  }
  return JSON.parse(fs.readFileSync(TOKENS_PATH, "utf8"));
}

async function refresh(tokens) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "offline",
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      "Token verversen mislukt. Draai `npm run auth` opnieuw. " + JSON.stringify(data)
    );
  }
  // WHOOP roteert refresh tokens: altijd de nieuwe opslaan
  return saveTokens(data);
}

export async function getAccessToken({ force = false } = {}) {
  let tokens = loadTokens();
  if (force || Date.now() >= tokens.expires_at) {
    tokens = await refresh(tokens);
  }
  return tokens.access_token;
}
