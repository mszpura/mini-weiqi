# Copilot Instructions for mini-weiqi

## Build, lint, and verification commands

- `npm run dev`: local development mode. Builds API first, then runs Robo API server on `3001` and Vite on `3000`.
- `npm run dev:tunnel`: same as `dev`, but also starts a Cloudflare tunnel.
- `npm run build`: full production build (`robo build` + Vite build to `.robo/public`).
- `npm run build:api`: backend/API build only.
- `npm run build:web`: frontend build only.
- `npm run start`: start production Robo server.
- `npm run lint:style`: run Prettier formatting across the repo.
- `npm run doctor`: environment diagnostics.

Testing status in this repo:

- There is currently no automated unit/integration test runner configured in `package.json`.
- There is no single-test command available yet.
- Use `npm run build` as the main regression check, then manually verify menu/board/API flows via `npm run dev`.

## High-level architecture

- This is a Robo.js + Vite + React TypeScript Discord Activity app.
- Frontend entrypoint is `src/app/index.tsx`, rendering `App.tsx`.
- `App.tsx` composes two providers:
  - `DiscordContextProvider` (`src/hooks/useDiscordSdk.tsx`) for Discord SDK readiness/auth session.
  - `SyncContextProvider` (`@robojs/sync`) for shared state across participants.
- Multiplayer/session state is persisted through `useSyncState` keys that are channel-scoped (`[key, channelId]`) so state is isolated per Discord channel.
- Board interaction is in `src/app/modules/game-board/GameBoard.tsx` using `tenuki`:
  - UI emits moves through `onPlayMove`.
  - Canonical move history is the synced `moves` array in `App.tsx`.
  - Captures are recomputed from move history using a fresh `tenuki` `Game`, so derived stats stay deterministic.
- Backend is file-based API routing under `src/api` (Robo server plugin):
  - `src/api/token.ts` handles OAuth code exchange with Discord.
  - `src/api/health.ts` and `src/api/index.ts` provide health/default endpoints.
- Vite proxy config (`config/vite.mjs`) routes:
  - `/.proxy/api` and `/api` -> Robo server (`127.0.0.1:3001`)
  - `/sync` websocket -> Robo server
- `config/robo.mjs` disables bot mode and ignores frontend folders in Robo watcher to avoid unnecessary API rebuild triggers.

## Key repository conventions

- Keep feature UI grouped in `src/app/modules/<feature>/` (current examples: `menu`, `game-board`).
- Shared app domain types live in `src/app/models` (for example `GameMode`, `GameMove`, `PlayerSlot`).
- Hooks follow `useXxx` naming; Discord integration logic is centralized in `src/hooks/useDiscordSdk.tsx`.
- Discord auth flow expects API token exchange via `/api/token` and falls back between `/.proxy/api/token` and `/api/token` depending on embedded/local context.
- In local non-embedded mode, Discord SDK mock mode is used with sessionStorage-backed synthetic IDs (`user_id`, `guild_id`, `channel_id`) for stable local multiplayer simulation.
- Use tabs for indentation and let Prettier enforce formatting (`npm run lint:style`).
