import { API_BASE } from "./config.js";
import { getAccessToken } from "./tokens.js";

async function request(path, params = {}, retried = false) {
  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  const token = await getAccessToken({ force: retried });
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401 && !retried) return request(path, params, true);
  if (response.status === 429) throw new Error("WHOOP rate limit bereikt, probeer het zo opnieuw.");
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
