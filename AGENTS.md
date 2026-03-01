# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: React client code.
- `src/app/modules`: UI modules (`game-board`, `menu`).
- `src/app/models`: shared front-end domain types.
- `src/hooks`: reusable React hooks (for example Discord SDK helpers).
- `src/api`: file-based backend routes served by Robo.js (`health.ts`, `token.ts`, etc.).
- `config/`: Vite and Robo plugin configuration.
- `public/`: static assets (images, icons).

Keep feature code grouped by module. Prefer adding related view + logic under `src/app/modules/<feature>/` rather than spreading files across the app.

## Build, Test, and Development Commands
- `npm run dev`: runs API build, starts Robo server on `3001`, and Vite on `3000`.
- `npm run dev:tunnel`: same as dev plus Cloudflare tunnel for external access.
- `npm run build`: production build for API + web output into `.robo/public`.
- `npm run build:api`: builds only backend API.
- `npm run build:web`: builds only frontend bundle.
- `npm run start`: starts production Robo server.
- `npm run lint:style`: formats codebase with Prettier.
- `npm run doctor`: environment diagnostics.

## Coding Style & Naming Conventions
- Language: TypeScript (`.ts`, `.tsx`), ESM modules.
- Formatting: Prettier (`.prettierrc.mjs`), tabs for indentation (match existing files).
- React components: PascalCase file and export names (example: `GameBoard.tsx`).
- Hooks: `useXxx` naming (example: `useDiscordSdk.tsx`).
- Models/types: place shared types in `src/app/models` and keep names descriptive (`GameMove`, `PlayerSlot`).

## Testing Guidelines
No automated test framework is currently configured. Before opening a PR:
- Run `npm run build` to catch type/build regressions.
- Run `npm run dev` and verify key flows manually (menu, board interactions, API-backed behavior).
- For API changes, validate affected routes under `src/api` locally.

## Commit & Pull Request Guidelines
Recent history favors short, imperative commit messages (for example: `fix hover stones`, `add buy me a coffee`). Use clear, scoped messages like:
- `fix(board): increase 19x19 viewport size`
- `feat(api): add health response metadata`

PRs should include:
- concise summary of behavior changes,
- linked issue/context,
- screenshots or short video for UI updates,
- verification notes (commands run and manual checks performed).

## Security & Configuration Tips
- Store secrets in `.env`; never commit credentials.
- Keep local ports aligned with project defaults (`3000` app, `3001` API) unless coordinated.
