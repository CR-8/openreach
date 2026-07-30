# OpenReach — Build Prompt for Agentic Coding Execution

You are building **OpenReach**: a free, open-source, self-hostable WhatsApp AI automation platform. This document is your complete spec. Follow it literally. Do not add abstractions, services, or "future-proofing" that isn't explicitly requested below — see the **Anti-Overengineering Rules** section, which overrides your default instincts toward extensibility.

---

## 1. What You Are Building

A self-hosted web application where an organization can:
1. Connect one or more WhatsApp numbers (via WPPConnect)
2. Build automations visually, n8n-style (drag nodes, connect them, save, activate)
3. Chat with contacts, optionally handing off between AI and a human agent
4. Run broadcast/drip campaigns
5. See usage analytics

It is 100% free and open source. There is no paid tier, no license key, no telemetry phoning home. Users bring their own AI provider keys (OpenAI, Anthropic, Gemini, Groq, OpenRouter, or local Ollama). The only cost to the user is their own server.

---

## 2. Non-Goals (do not build these — if you find yourself building toward one of these, stop)

- No CRM, email, Instagram, Telegram, Facebook, voice, or video
- No billing, payments, or subscription logic of any kind
- No plugin marketplace or plugin SDK (Phase 3 idea only — do not scaffold it now)
- No microservices split beyond what's listed in the architecture — this is a **monolith backend + one worker process + one WhatsApp session service**, not 6 services talking over a message bus
- No custom-built workflow engine abstraction layer "for future node types" — build exactly the node types listed in section 7, in a single executor, and stop
- No multi-region / multi-cluster design. Single-server Docker Compose is the target deployment. Kubernetes manifests are NOT required.
- No GraphQL. REST only.
- No custom auth system with email verification flows, magic links, SSO, etc. — JWT + refresh token + bcrypt password is enough for v1.

---

## 3. Tech Stack (exact, do not substitute)

**Frontend**
- Next.js 15 (App Router), React 19, TypeScript (strict mode)
- TailwindCSS
- shadcn/ui — pull actual components and blocks from the shadcn registry (`npx shadcn@latest add ...`) rather than hand-rolling primitives. Use shadcn **blocks** (dashboard blocks, sidebar blocks, login blocks) as the starting layout scaffolds wherever one exists that fits, then customize.
- TanStack Query for server state
- React Hook Form + Zod for forms/validation
- Zustand for local/client-only UI state (e.g. workflow canvas state) — do NOT use Redux
- `@xyflow/react` (React Flow) for the workflow canvas — this is what gives you the n8n-style drag/connect/zoom canvas. Do not build a custom canvas renderer.
- Socket.IO client for realtime conversation updates

**Backend**
- NestJS, TypeScript strict mode
- Prisma ORM + PostgreSQL (never MongoDB)
- BullMQ + Redis for background jobs (campaign sends, message queue, embedding jobs)
- Socket.IO server
- Swagger/OpenAPI auto-generated from decorators

**WhatsApp Engine**
- WPPConnect, run via its own server wrapper (`wppconnect-server`) as a **separate container/process**, never embedded directly inside the NestJS process. Your NestJS backend talks to it over HTTP + receives webhooks from it. This isolates Puppeteer/Chromium crashes from your API process.

**AI Gateway**
- LiteLLM as a proxy container in front of all AI providers. Your backend always calls LiteLLM's OpenAI-compatible endpoint; it never calls OpenAI/Anthropic/Gemini SDKs directly. This is what gives you BYO-key + provider-switching + fallback for free, without writing that logic yourself.

**Storage**
- MinIO (S3-compatible), for media/documents

**Infra**
- Docker Compose only. One `docker compose up -d` and the whole stack (web, api, worker, wppconnect-server, litellm, postgres, redis, minio) comes up.
- Traefik as reverse proxy/TLS termination — optional profile, not mandatory for local dev

---

## 4. Architecture

### 4.1 Monorepo layout (pnpm workspaces + Turborepo)

```
apps/
  web/              # Next.js frontend
  api/              # NestJS backend (REST + WebSocket + BullMQ workers in-process for v1)
packages/
  ui/               # shared shadcn-based component package, used by web
  types/            # shared TypeScript types/DTOs between web and api
docker/
  docker-compose.yml
  wppconnect/
  litellm/
docs/
```

Do NOT split `worker` into its own app for v1 — run BullMQ processors inside the `api` app as a separate NestJS process launched from the same codebase (`main.ts` vs `worker.ts` entrypoint), sharing the same Prisma client and modules. This avoids duplicating business logic across two apps while still letting you scale the worker independently in Docker Compose if needed.

### 4.2 The one abstraction you SHOULD build: MessagingProvider

```typescript
interface MessagingProvider {
  sendMessage(sessionId: string, to: string, text: string): Promise<MessageResult>;
  sendMedia(sessionId: string, to: string, media: MediaPayload): Promise<MessageResult>;
  getSession(sessionId: string): Promise<SessionStatus>;
  createSession(sessionId: string): Promise<QrCodeResult>;
  reconnect(sessionId: string): Promise<void>;
  disconnect(sessionId: string): Promise<void>;
  getContacts(sessionId: string): Promise<Contact[]>;
  // webhook ingestion is handled by a controller that calls into a
  // shared `MessageIngestionService`, not by this interface directly
}
```

Implement exactly one concrete class for v1: `WppConnectMessagingProvider`. Do not build a provider registry, factory pattern, or dependency-injection token map for "future providers" — just implement the interface once, inject it via NestJS's normal DI, and move on. If a second provider is ever needed later, that's a future problem.

### 4.3 Multi-tenancy

- Single PostgreSQL database, shared schema, every tenant-scoped table has an `organizationId` column with a Postgres Row-Level-Security policy keyed to the authenticated request's org context. Do NOT do schema-per-tenant or database-per-tenant — that's overengineering for a self-hosted tool where most deployments will have 1–5 orgs anyway.
- Enforce org scoping in a single NestJS `TenantGuard` + Prisma middleware that auto-injects `organizationId` into every query. Write this once, correctly, and reuse it everywhere.

### 4.4 Core data model (Prisma, high level — flesh out fields as you build)

```
Organization, User, Membership (role: admin | agent)
WhatsappSession (organizationId, provider, status, phoneNumber)
Contact (organizationId, sessionId, phone, name, tags[])
Conversation (organizationId, contactId, status, assignedUserId, aiEnabled)
Message (conversationId, direction, type, content, mediaUrl, aiGenerated)
AiProvider (organizationId, name, baseUrl, apiKeyEncrypted, defaultModel)
Prompt (organizationId, name, systemPrompt, variables, temperature, version)
Agent (organizationId, name, promptId, knowledgeBaseId, greeting, businessHours)
KnowledgeBase, KnowledgeDocument, KnowledgeChunk (with pgvector embedding column)
Workflow (organizationId, name, nodes JSON, edges JSON, isActive)
WorkflowRun (workflowId, status, startedAt, finishedAt, error)
Campaign (organizationId, name, type: broadcast|drip, status, schedule)
CampaignRecipient (campaignId, contactId, status, sentAt)
AuditLog (organizationId, userId, action, metadata, createdAt)
```

Use `pgvector` extension in the same Postgres instance for embeddings — do not stand up a separate vector database (no Qdrant/Pinecone/Weaviate). One database, one connection, less infra.

---

## 5. API Design

REST, versioned under `/api/v1`. Resource-based routes matching the data model:

```
/auth/login, /auth/refresh, /auth/logout
/organizations
/users
/whatsapp-sessions
/contacts
/conversations
/conversations/:id/messages
/ai-providers
/prompts
/agents
/knowledge-bases
/knowledge-bases/:id/documents
/workflows
/workflows/:id/runs
/campaigns
/analytics
/settings
```

Every module: controller → service → Prisma. No repository-pattern layer on top of Prisma — Prisma's client already is your repository layer. Do not add a redundant abstraction over it.

---

## 6. UI / UX Guide (screen by screen)

Overall visual language: dark-mode-first, Linear/Vercel/Raycast inspired, generous whitespace, no Material/Ant defaults. Use shadcn/ui components throughout — pull directly from the shadcn registry for: sidebar, data-table, dialog, sheet, command palette (cmd+k), dropdown-menu, tabs, form, toast, badge, avatar, chart (via `shadcn` chart wrappers over Recharts).

### 6.1 App Shell
- Left sidebar (shadcn `sidebar-07` block style): collapsible, icon + label nav — Dashboard, Conversations, Workflows, Campaigns, Agents, Prompts, Knowledge Base, Contacts, Analytics, Settings.
- Top bar: organization switcher (dropdown), cmd+k command palette, user menu (avatar dropdown) top-right.
- Everything inside a `max-w` centered content area except the workflow canvas, which is full-bleed.

### 6.2 Dashboard
- Grid of stat cards (shadcn `card` + `chart`): messages today, active conversations, AI response rate, campaign performance.
- Recent conversations list (shadcn `data-table` with avatar + last message preview + relative time).
- Connected WhatsApp sessions status widget (green/red dot per session, using shadcn `badge`).

### 6.3 Conversations (Inbox)
- Three-pane layout, exactly like a modern support inbox (Linear/Front style):
  - Left pane: conversation list, filterable by status/tag/assignee (shadcn `tabs` for status filter, `input` with search icon for search).
  - Middle pane: message thread, bubbles left/right (contact vs. outgoing), AI-generated messages get a subtle "AI" badge (shadcn `badge` variant), manual takeover toggle at the top of the thread (shadcn `switch` labeled "AI enabled").
  - Right pane: contact details, tags (shadcn `badge` list + add-tag `command` popover), conversation summary, assign-to-agent dropdown.
- Composer at bottom of middle pane: textarea (shadcn `textarea`) + send button + attachment icon (opens shadcn `dialog` for media upload to MinIO).

### 6.4 Workflows (n8n-style canvas) — the centerpiece screen
- Full-bleed canvas using React Flow. Left-side collapsible node palette (shadcn `sheet` or persistent sidebar panel) listing draggable node types, grouped:
  - **Triggers:** Receive Message
  - **Logic:** Condition, Switch
  - **AI:** AI Response, Knowledge Search
  - **Actions:** Send Message, Delay, HTTP Request, Webhook, Database Query, Assign Ticket, Human Takeover
  - **Flow:** End
  - Cap at 20 nodes per workflow (enforce in the UI with a visible counter and a soft warning at 18, hard block at 20).
- Each node on canvas: rounded card, icon + label, colored left border by category (trigger=blue, logic=amber, ai=violet, action=green). Clicking a node opens a right-side config `sheet` with a form specific to that node type (shadcn `form` + `select`/`input`/`textarea` per field).
- Top toolbar over the canvas: workflow name (inline-editable), Active/Inactive toggle (shadcn `switch`), Save button, Run History button (opens `sheet` listing past `WorkflowRun`s with status badges).
- Minimap and zoom controls (React Flow built-ins, restyled with Tailwind to match the dark theme) bottom-right of canvas.
- Connection lines: bezier, animated dash when a workflow is actively running (subscribe to a Socket.IO event per run for live "which node is executing now" highlighting — this is the single "wow" interaction worth building, everything else in the canvas can be static).

### 6.5 Prompt Studio
- Split view: left = prompt list (shadcn `data-table`), right = editor.
- Editor: name, description inputs; large `textarea` (or a lightweight code-editor component) for the system prompt with `{{variable}}` highlighting; variables list builder (repeatable field group); model/temperature/max-tokens controls (shadcn `slider` for temperature); provider override `select`.
- Bottom half of editor: "Test Playground" — a mini chat interface (reuse the conversation bubble component) where the user types a test message and sees the prompt's live output streamed from LiteLLM.
- Version history as a simple `select` dropdown ("v3 (current)", "v2", "v1") — no diff viewer needed for v1.

### 6.6 Agents
- Card grid (shadcn `card`), one card per agent: avatar, name, linked prompt, linked knowledge base, active/inactive `switch`.
- Click a card → detail/edit `sheet`: greeting message, business hours (simple day-of-week + time-range picker, not a full calendar component), escalation rule (simple `select`: "after N failed responses" / "on keyword match" / "never"), knowledge base `select`.

### 6.7 Knowledge Base
- List of knowledge bases (`card` grid). Inside one: document list (shadcn `data-table` with file-type icon, chunk count, status: processing/ready/error) + drag-and-drop upload zone (shadcn styling over a plain HTML5 drop zone, no heavy upload library needed) + "Add URL" and "Add Note" simple form dialogs.

### 6.8 Campaigns
- List view (`data-table`): name, type badge (broadcast/drip), status badge, recipients count, sent/delivered/read stats inline.
- Create/edit: stepper-free single-page form (shadcn `form`) — audience selection (contact list multi-select or tag filter), message content (reuse prompt-style text input with variable insertion), schedule (date-time picker), rate-limit and working-hours controls (simple numeric inputs, not a visual scheduler).

### 6.9 Analytics
- Grid of shadcn `chart` components: messages over time (line), AI vs human response split (pie/donut), response time distribution (bar), top prompts/agents by volume (horizontal bar/table), AI cost estimate (card).

### 6.10 Settings
- Tabs (shadcn `tabs`): Organization, Users & Roles, WhatsApp Sessions (QR connect flow lives here — a `dialog` showing a live QR code image that polls session status), AI Providers (list + add-provider form storing key/base-url/model), API Keys (for external API access), Audit Log (`data-table`).

### 6.11 Auth screens
- Plain, minimal: login, register-org (creates first org + admin user), forgot/reset password. Use a shadcn auth block as the starting point, don't hand-build the layout.

---

## 7. Core Modules — Phase 1 Feature Scope (build exactly this, nothing more, for v1)

1. Auth (JWT + refresh, RBAC: admin/agent, org-scoped)
2. Organizations (create, single org per deployment is fine for v1 — multi-org UI can exist, but don't build cross-org admin tooling yet)
3. WhatsApp session connect via WPPConnect (QR login, status, reconnect, disconnect)
4. Conversations + Messages (send/receive, webhook ingestion, realtime via Socket.IO)
5. Prompt Studio (CRUD + test playground)
6. AI Provider management (CRUD, proxied through LiteLLM)
7. Basic AI auto-reply on a conversation (toggle AI on/off per conversation, backed by one Prompt)
8. Workflow builder (the node set in 6.4, executed by a single in-process executor service — a straightforward loop that walks nodes/edges, no separate workflow-execution microservice)
9. Dashboard + basic Analytics (counts and simple charts from existing tables — don't build a separate analytics/OLAP database)
10. Docker Compose one-command deploy

Explicitly **defer** to Phase 2 (do not start these now): Knowledge Base/RAG, Campaigns, Agents module, Ticket system, Audit logs UI. Their DB tables can exist as stubs in the Prisma schema if convenient, but do not build the services/UI for them in v1.

---

## 8. Coding Standards

- TypeScript strict mode everywhere, no `any` without a `// justified:` comment explaining why
- ESLint + Prettier, enforced in CI
- Feature-first folder structure inside `apps/api/src` (e.g. `modules/conversations/`, not layered-by-type `controllers/`, `services/` at the root)
- One NestJS module per resource, standard controller → service → Prisma flow
- All secrets/config via environment variables, validated at boot with Zod (fail fast, loud error, not a silent default)
- Structured logging (pino or Nest's built-in Logger with JSON output), no `console.log`
- Idempotent BullMQ jobs (safe to retry)
- Prisma migrations only — never hand-edit the database schema
- Tests: unit tests for services with non-trivial logic (workflow executor, message ingestion), integration test for the auth flow and one full conversation send/receive round trip. Do not aim for 100% coverage — test the parts that are easy to get subtly wrong.

---

## 9. Anti-Overengineering Rules (read this twice)

- Build for **one server, Docker Compose, a handful of organizations**. Do not add Kubernetes, service mesh, message brokers beyond BullMQ/Redis, or multi-region anything.
- Build **one** implementation of `MessagingProvider`. Do not build a plugin/registry system for providers that don't exist yet.
- Build **exactly** the workflow node types listed above. Do not add a "custom node SDK" or "node marketplace."
- Do not add a caching layer beyond what Redis/BullMQ already gives you for free. No separate CDN config, no edge functions.
- Do not build a generic "form builder" or "schema builder" for anything — every form in the UI is a specific, hand-written shadcn `form` for its specific entity.
- Do not add feature flags, A/B testing, or experimentation infrastructure.
- If a decision could go either "simple" or "flexible/future-proof" way, choose simple. This whole project should feel like something one competent engineer can read top-to-bottom in an afternoon.

---

## 10. Deployment

Single command:
```bash
docker compose up -d
```
brings up: `web`, `api`, `worker` (same image as api, different entrypoint), `wppconnect-server`, `litellm`, `postgres` (with pgvector extension), `redis`, `minio`. Provide a `.env.example` with every required variable and sane local defaults. Provide a `docker/README.md` with the exact steps: clone, copy `.env.example` to `.env`, fill in nothing-required-to-start (it should run locally with zero manual config beyond `docker compose up -d`), then visit `http://localhost:3000` to register the first org/admin.

---

## 11. Build Order (execute in this sequence)

1. Scaffold monorepo (pnpm + Turborepo), Docker Compose skeleton with all services booting (even if apps are just "hello world" at first) — prove the infra works before writing features.
2. Prisma schema (full model from section 4.4, including Phase 2 stub tables) + migrations + RLS policies + `TenantGuard`.
3. Auth module end-to-end (register org/admin, login, JWT, refresh, RBAC guard).
4. WPPConnect integration: `WppConnectMessagingProvider`, session connect/QR/status, webhook ingestion into `Message`/`Conversation` tables, Socket.IO broadcast of new messages.
5. Conversations UI (inbox, three-pane) wired to real data + realtime updates.
6. AI Provider CRUD + LiteLLM wiring + Prompt Studio (with working test playground).
7. Manual/AI toggle on a conversation: wire a Prompt to auto-generate replies via LiteLLM when AI is enabled on that conversation.
8. Workflow builder: React Flow canvas UI first (static, no execution), then the node config sheets, then the executor service, then the live-run-highlighting Socket.IO wiring last.
9. Dashboard + Analytics screens over existing data.
10. Polish pass: empty states, loading states, error toasts (shadcn `toast`) on every mutation, auth screens.

Do not jump ahead to Workflow builder before Conversations are working end-to-end — each step should produce something demonstrably working before the next begins.