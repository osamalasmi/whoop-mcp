# whoop-mcp

Personal MCP server that connects my WHOOP data to Claude

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your WHOOP Client ID and Client Secret.
3. `npm run auth` and log in to WHOOP in the browser. Tokens are saved in `tokens.json`.
4. Add the server to Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "whoop": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/whoop-mcp/src/server.js"]
    }
  }
}
```

5. Restart Claude Desktop.

## Tools
`get_profile`, `get_recovery`, `get_sleep`, `get_strain`, `get_workouts`, `get_overview`.
Each tool (except profile) takes `days` (1-90, default 7).

## Privacy
This app is for personal use only.
It reads my WHOOP data (sleep, recovery, strain, workouts, profile)
to generate health insights. Data is not sold or shared with third parties.
Access can be revoked at any time through the WHOOP account.
