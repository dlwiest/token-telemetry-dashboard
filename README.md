# Token Telemetry Dashboard

Wall-mountable dashboard showing remaining usage quotas for AI coding tools.

Supports **Claude Code**, **OpenAI Codex**, and **GitHub Copilot**. Designed for a tablet or spare screen mounted in your workspace — brutalist Gruvbox Dark styling, kiosk-ready with fullscreen toggle and screen wake lock.

## Prerequisites

You only need credentials for the providers you use. The dashboard auto-detects which are available.

| Provider | Requirement |
|---|---|
| **Claude Code** | Logged in via `claude auth login`. Reads credentials from `~/.claude/.credentials.json` or macOS Keychain. |
| **OpenAI Codex** | `codex` CLI installed and authenticated (`~/.codex/auth.json`). |
| **GitHub Copilot** | `gh` CLI installed and authenticated (`gh auth login`) with a Copilot subscription. |

## Quick Start

```bash
git clone <repo-url> && cd token-telemetry-dashboard
npm install
cp .env.example .env    # optional — edit to toggle providers or change poll interval

# Development (hot-reload on :4801, API on :4800)
npm run dev

# Production (single server on :4800, serves built frontend)
npm run build
npm start
```

Open `http://localhost:4800` (production) or `http://localhost:4801` (dev).

## Configuration

All config is optional. Edit `.env` or set environment variables:

```env
ENABLE_CLAUDE=true          # Toggle providers on/off (auto-detected if omitted)
ENABLE_CODEX=true
ENABLE_COPILOT=true
POLL_INTERVAL=30            # Seconds between API polls (default: 30, min: 5)
PORT=4800                   # Server port (default: 4800)
```

You can also override Claude credentials directly:
```env
CLAUDE_CODE_OAUTH_TOKEN={"accessToken":"...","refreshToken":"..."}
```

## Kiosk / Tablet Setup

The dashboard is designed to run on a mounted tablet:

- **Fullscreen**: Click the `[ ]` button in the top-right header corner
- **Screen wake**: Uses Wake Lock API + video fallback to prevent dimming
- **PWA**: Add to home screen on Android/iOS for app-like experience (uses `manifest.json`)
- **Auto-start on macOS**: Create a launchd plist pointing to `npm start` in the project directory

### Kindle Fire Tips

- Install "Fully Kiosk Browser" or "Keep Screen On" from the Amazon App Store
- Enable Developer Options → Stay Awake to prevent sleep while charging
- Access via `http://<your-computer-ip>:4800` on the local network

## Architecture

Single-package Vite + React 19 + TypeScript frontend with an Express 5 backend.

- **Backend** (`server/`): Express serves `GET /api/telemetry` and `GET /api/config`. Each provider is fetched via `Promise.allSettled` so one failing doesn't take down the others.
- **Frontend** (`src/`): React with TanStack Query for polling. Tailwind CSS with custom Gruvbox Dark tokens.
- **Dev mode**: Vite dev server on `:4801` proxies `/api` to Express on `:4800`.
- **Production**: Express serves the built frontend from `dist/` on a single port.

### Provider Data Sources

| Provider | Method |
|---|---|
| Claude Code | OAuth usage API (`api.anthropic.com/api/oauth/usage`). Auto-refreshes expired tokens. |
| OpenAI Codex | Spawns `codex app-server`, sends JSON-RPC `account/rateLimits/read` over stdio. |
| GitHub Copilot | `gh api /copilot_internal/user` for premium interaction quotas. |

## Platform Support

| Platform | Status |
|---|---|
| **macOS** | Full support. Reads credentials from Keychain or credentials file. |
| **Linux** | Works if `~/.claude/.credentials.json` exists (or `CLAUDE_CODE_OAUTH_TOKEN` is set). Codex and Copilot need their CLIs on PATH. |
| **Windows** | Not currently supported. Credential discovery and CLI spawning assume Unix. |

## License

MIT
