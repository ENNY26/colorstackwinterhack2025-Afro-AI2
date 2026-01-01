<!--
Guidance for AI coding agents working on the AfroLingo repository.
Keep this file short, actionable, and tightly tied to repo patterns.
-->

# Copilot / AI Agent Instructions — AfroLingo

Purpose: give an AI code-assistant the exact, discoverable knowledge needed to be productive in this codebase.

- Quick commands
  - Backend (Unix): `cd backend && go mod download && cp .env.example .env && go run cmd/server/main.go`
  - Backend (Windows PowerShell): `cd backend; go mod download; Copy-Item .env.example .env; go run cmd/server/main.go`
  - Alternative (Make): `cd backend && make run`
  - Mobile: `cd mobile && npm install && npm start` (Expo)

- Architecture (big picture)
  - Mobile app: `mobile/` — React Native (Expo). App expects an API base URL in `mobile/src/constants/api.js`.
  - Backend: `backend/` — Go + Fiber. Key layers: `cmd/server` (entry), `internal/handlers` (HTTP handlers), `internal/services` (business logic), `internal/models` (GORM models), `internal/ai` (OpenAI/Whisper/TTS client), `internal/storage` (S3), `pkg` (shared utilities like `pkg/jwt` and `pkg/websocket`).
  - Data flow: handlers parse requests → call services → services interact with `database.DB`, `ai.NewOpenAIClient()` and `storage.NewS3Client()` → handlers return JSON. See `cmd/server/main.go` for wiring.

- Important repository conventions
  - Use `internal/handlers` for HTTP surface; keep handlers thin and delegate to `internal/services`.
  - `internal/config/config.go` loads env via `godotenv` and exposes `AppConfig` global. Modify environment settings via `.env` (copy from `.env.example`).
  - Database: GORM is used and `database.AutoMigrate()` runs on startup. Models live in `internal/models` and are migrated automatically.
  - Authentication: JWT utilities are in `pkg/jwt`. Handlers expect `middleware.AuthMiddleware()` to set `userID` on `c.Locals("userID")` (a `uuid.UUID`) — handlers use that directly.
  - OpenAI integration: `internal/ai/openai_client.go` contains Chat, Transcription, and TTS helpers and builds language-specific system prompts. If you change prompt logic, update that file.
  - WebSockets: Hub and clients live under `pkg/websocket`. Server registers a hub in `cmd/server/main.go` and exposes `/ws`.
  - S3 storage: `internal/storage` provides a client used by `internal/handlers/audio_handler.go` for uploads and presigned URLs.

- Typical change pattern
  - New REST feature: add route in `cmd/server/main.go` → create handler in `internal/handlers` → implement business logic in `internal/services` → add/modify model in `internal/models` → rely on `database.AutoMigrate()` during dev.
  - New AI behavior: extend `internal/ai/prompt_engine.go` or `openai_client.go` and inject client into services in `cmd/server/main.go`.

- Key files to inspect when asked about behavior
  - Request routing & middleware: `backend/cmd/server/main.go`
  - Configuration: `backend/internal/config/config.go` and `.env.example`
  - OpenAI client & prompts: `backend/internal/ai/openai_client.go`
  - Auth flow: `backend/internal/handlers/auth_handler.go` and `backend/pkg/jwt/jwt.go`
  - Conversation logic: `backend/internal/handlers/conversation_handler.go` and `backend/internal/services/conversation_service.go`
  - Database connection & migrations: `backend/internal/database/database.go`
  - WebSocket hub: `backend/pkg/websocket/hub.go` (and related client code)
  - Mobile API constants: `mobile/src/constants/api.js` (update to point to local backend during testing)

- Integration points and external dependencies
  - OpenAI: API key set via `OPENAI_API_KEY` and configured in `internal/config`.
  - AWS S3: credentials via `AWS_*` env vars, bucket name `S3_BUCKET_NAME`. Storage client is optional (startup tolerates failure and logs a warning).
  - PostgreSQL: configured via env vars (DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME). Use `database.Connect()` in dev.

- Small but important implementation details
  - Handlers rely on Fiber's `c.Locals("userID")` being a `uuid.UUID`. When writing tests or stubbing middleware, set `c.Locals("userID", uuid.Parse("..."))` accordingly.
  - `internal/ai/openai_client.go` selects TTS voices using names like `alloy`, `echo`, `nova` — preserve those strings when adding UI options.
  - CORS origins are loaded from `ALLOWED_ORIGINS` and parsed by `internal/config.parseStringSlice`; the default includes `http://localhost:3000` and Expo's default `http://localhost:19006`.
  - Database migrations are idempotent and use GORM AutoMigrate on startup; adding non-trivial schema changes should be considered carefully.

- Examples (copyable)
  - Create conversation (curl):
    ```bash
    curl -X POST http://localhost:8080/api/v1/conversations \
      -H "Authorization: Bearer <access_token>" \
      -H "Content-Type: application/json" \
      -d '{"language":"swahili","language_code":"swahili","conversation_type":"casual"}'
    ```
  - Send audio to Transcribe (curl): see `backend/API_DOCUMENTATION.md` for precise fields used by `internal/ai`.

- Agent behavior rules (what to do vs. avoid)
  - Do: Keep changes minimal and local to the requested feature; follow existing layering (handler → service → model). Update `cmd/server/main.go` only for wiring new top-level dependencies.
  - Do: Update `internal/config` and `.env.example` when new env vars are required.
  - Avoid: Large structural refactors without opening an issue first. Avoid changing authentication mechanics (`pkg/jwt`) unless required.
  - When adding AI prompt changes, keep language mappings in `openai_client.go` in sync with `mobile/src/constants/languages.js`.

If anything here is unclear or you'd like more detail about a specific area (for example, the audio upload flow or the conversation prompt engineering), tell me which part and I will expand the instructions or add short code examples.
