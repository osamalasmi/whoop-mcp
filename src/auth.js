// Eenmalig draaien: `npm run auth`
// Opent een lokale server op de redirect-URL, laat je inloggen bij WHOOP
// en slaat de tokens op in tokens.json.
import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import {
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  AUTH_URL,
  TOKEN_URL,
  SCOPES,
  CONFIG_ERROR,
} from "./config.js";
import { saveTokens } from "./tokens.js";

if (CONFIG_ERROR) {
  console.error(CONFIG_ERROR);
  process.exit(1);
}

const redirect = new URL(REDIRECT_URI);
const state = crypto.randomBytes(16).toString("hex");

const authLink = new URL(AUTH_URL);
authLink.searchParams.set("client_id", CLIENT_ID);
authLink.searchParams.set("redirect_uri", REDIRECT_URI);
authLink.searchParams.set("response_type", "code");
authLink.searchParams.set("scope", SCOPES);
authLink.searchParams.set("state", state);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== redirect.pathname) {
    res.writeHead(404).end();
    return;
  }

  if (url.searchParams.get("state") !== state) {
    res.writeHead(400).end("Ongeldige state. Probeer opnieuw.");
    return;
  }

  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Geen code ontvangen: " + url.searchParams.get("error"));
    return;
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    saveTokens(data);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Gelukt! Je kunt dit tabblad sluiten.</h2>");
    console.log("Tokens opgeslagen in tokens.json");
  } catch (err) {
    res.writeHead(500).end("Fout bij token-uitwisseling");
    console.error(err);
  } finally {
    server.close();
  }
});

// Alleen op deze Mac luisteren, niet op het hele netwerk.
server.listen(Number(redirect.port) || 80, "127.0.0.1", () => {
  console.log("Open deze link om in te loggen bij WHOOP:\n");
  console.log(authLink.toString() + "\n");
  if (process.platform === "darwin") execFile("open", [authLink.toString()]);
});
