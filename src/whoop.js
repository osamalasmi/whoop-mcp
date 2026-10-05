import { API_BASE, CONFIG_ERROR } from "./config.js";
import { getAccessToken } from "./tokens.js";

const TIMEOUT_MS = 15_000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, params = {}, { rejected, rateLimited = false } = {}) {
  if (CONFIG_ERROR) throw new Error(CONFIG_ERROR);

  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const token = await getAccessToken({ rejected });
  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError") throw new Error("WHOOP API reageert niet (timeout).");
    throw err;
  }

  if (response.status === 401 && !rejected) {
    return request(path, params, { rejected: token, rateLimited });
  }
  if (response.status === 429) {
    if (rateLimited) throw new Error("WHOOP rate limit bereikt, probeer het zo opnieuw.");
    // Eén keer opnieuw proberen na Retry-After (max 10 seconden).
    const wait = Math.min(Number(response.headers.get("retry-after")) || 2, 10);
    await sleep(wait * 1000);
    return request(path, params, { rejected, rateLimited: true });
  }
  if (!response.ok) throw new Error(`WHOOP API ${response.status}: ${await response.text()}`);
  return response.json();
}

// Haalt alle records op van de afgelopen `days` dagen (max 25 per pagina).
async function collection(path, days) {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const records = [];
  let nextToken;
  for (let page = 0; page < 20; page++) {
    const data = await request(path, { start, limit: 25, nextToken });
    records.push(...(data.records || []));
    nextToken = data.next_token;
    if (!nextToken) break;
  }
  return records;
}

export const whoop = {
  profile: () => request("/v2/user/profile/basic"),
  body: () => request("/v2/user/measurement/body"),
  recovery: (days) => collection("/v2/recovery", days),
  sleep: (days) => collection("/v2/activity/sleep", days),
  cycles: (days) => collection("/v2/cycle", days),
  workouts: (days) => collection("/v2/activity/workout", days),
};
