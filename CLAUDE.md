# NFS — Narvee File Share OS
## Project Context for Claude Code

This file is the persistent context for this project. Read it before making any architectural or feature decisions. Every feature built in this repo must stay consistent with the vision below.

---

## THE CORE IDEA

NFS is **NOT** another cloud storage product (not a Dropbox/Google Drive clone). It is a **Communication-First, Local-First Distributed File Operating System**.

Traditional file storage model:
```
User → Folders → Files
```

NFS replaces that with:
```
People → Conversations → Files → Devices → Storage → Intelligence
```

In practice this means:
- Files are **sent directly to people**, like messages — not "uploaded" to a shared drive.
- Every file has a **conversation** attached to it (comments, replies, approvals, versions) — like a WhatsApp/Slack thread.
- Every device (laptop, desktop, phone, NAS) is a **trusted participant** in a device mesh — not just a client of the cloud.
- Storage is **intelligent and layered**: local device first, then local network/peer devices, then company storage, then cloud — cloud is optional, not mandatory.
- **AI understands files, people, and context** — users can ask "find last year's signed contracts" instead of navigating folders.

---

## END-TO-END WORKFLOW (how a file moves through the system)

1. **SEND** — A user picks a file and sends it to a person or team, like a chat message.
2. **FINGERPRINT** — The system hashes the file (SHA-256) to check if identical content already exists anywhere, avoiding duplicate storage.
3. **SMART ROUTING** — The system picks the fastest, safest delivery path: Local device → LAN → Trusted peer device → Company server → Cloud (last resort).
4. **DELIVERY** — The recipient's Inbox updates in real time: Delivered ✓ → Opened ✓ → Downloaded ✓.
5. **CONVERSATION** — Opening the file starts a thread beside it: comments, mentions, approvals, version history.
6. **SYNC** — Everything works offline-first: devices cache files locally and sync deltas (only changed bytes) when back online, resolving conflicts automatically.
7. **GOVERNANCE** — All of this happens under Zero Trust security: every access checks identity + device + risk, files are encrypted at rest and in transit, and every view/download/share is logged for audit.

---

## USER ROLES / PANELS

The product serves different audiences differently. Build with these roles in mind, but **only implement what the current phase calls for** (see "Current Build Status" below).

1. **Personal User** — individual employee: Inbox, Conversations, My Files, Devices, personal storage. The WhatsApp + Finder experience.
2. **Team/Workspace Member** — collaborates inside a shared workspace: team files, discussions, tasks, members, permissions (Slack + Teams style).
3. **Organization Admin** — manages users, roles, org-wide policies (sharing rules, retention, encryption).
4. **Device Admin / IT** — manages device enrollment, trust scores, remote wipe/lock, compliance.
5. **Storage Admin** — manages storage tiers (local/peer/cloud), deduplication, archiving policies.
6. **Security & Compliance Officer** — audit logs, threat detection, regulatory compliance (GDPR/HIPAA/SOC2).
7. **External Partner/Guest** — limited access for customers/vendors: secure links, expiring files, upload requests.
8. **Developer** — uses APIs, webhooks, SDKs to integrate NFS with other tools (Slack, Salesforce, Microsoft 365).
9. **Platform Operator** — monitors SaaS infrastructure itself (tenants, servers, storage nodes, billing) — only relevant if/when we go multi-tenant SaaS.

---

## WHAT MAKES NFS DIFFERENT
(Keep these principles in mind for every decision, no exceptions)

- No forced uploads — files move directly to people.
- No duplicate storage — one copy of a file, many references.
- Cloud is optional — local and peer storage come first.
- Files behave like messages, not static objects.
- Every device is a participant, not just a sync target.
- AI is native to the system, not bolted on later.

---

## CURRENT BUILD STATUS

We are building this in phases. **Do not jump ahead to a later phase's features unless explicitly asked.** Keep the data model flexible enough that later phases don't require a rewrite.

- [x] **Phase 0** — Monorepo setup (React/TS/Tailwind frontend, Node/TS/Postgres backend)
- [x] **Phase 1** — Foundation: auth, core schema (User, Device, File, Conversation, Message)
- [ ] **Phase 2** — Core communication loop: send file → Inbox → Conversation thread → real-time via WebSockets
- [ ] **Phase 3** — Local-first layer: desktop agent, SQLite cache, offline mode, delta sync
- [ ] **Phase 4** — Device & storage intelligence: device enrollment, dedup via hashing, storage routing
- [ ] **Phase 5** — Enterprise layer: Workspaces, RBAC, audit logs

> Update the checklist above as phases are completed, so future sessions know exactly where the build stands.

**Current focus:** MVP scoped to the **Personal User role only** — the Send → Conversation → Sync loop. Team/Admin/Security/Partner/Developer/Platform roles come later.

---

## ARCHITECTURE DECISIONS LOG

Decisions already made — don't re-litigate these without a explicit reason; extend, don't reverse.

- **File is content-addressed.** `File` (hash + metadata) is modeled separately from `FileLocation`/`FileCopy` (where a copy of that hash currently lives). Phase 1 only populates one location, but this split is what lets Phase 4 add local/peer/cloud tiers without restructuring.
- **Conversation attaches to the logical File (by hash/id), never to a FileLocation.** Two users who end up with the same deduped file must land in the same conversation thread — that's the core differentiator, not an implementation detail.
- **Recipients don't need a pre-existing account.** Sending to an email with no matching `User` creates a `PendingRecipient`/`Invite` record that resolves into a real Inbox entry once they sign up and claim it. Keep Phase 1's claim logic minimal (email + signup-triggered linking) — the full external-partner/guest portal is Phase 5+.
- **Auth for MVP is email+password + JWT** (access + refresh). Magic-link/passwordless is backlogged under Phase 1 in `backlog.md`, not built now.
- **Storage goes through a `StorageProvider` interface** (`save`/`get`/`delete`) even though Phase 1 only has a `LocalDiskProvider` implementation. Swapping in MinIO/S3 for Phase 4 must be a new implementation, not a rewrite of calling code.
- **Monorepo tooling is npm workspaces** — no Turborepo/pnpm until build times actually justify it.

---

## TECH STACK REFERENCE

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, Zustand, React Query |
| Real-time | WebSockets (Socket.IO) |
| Backend API | Node.js, TypeScript, Express |
| Database | PostgreSQL (via Prisma) — central; SQLite — local device cache |
| Storage | Local disk / MinIO / S3-compatible object storage |
| Dedup | SHA-256 content hashing |
| Auth | JWT (access + refresh tokens); SSO added later |
| Desktop Agent | Node.js background service (CLI first, Electron optional later) |

---

## GROUND RULES FOR CLAUDE CODE

1. Before implementing a feature, check it against the core idea and current phase — if it belongs to a later phase, flag it rather than building it early.
2. Don't default to "just another file storage" patterns (plain folder trees, upload buttons) — always frame around people/conversations first.
3. Keep the data model additive — new phases should extend models (e.g., adding `workspaceId`), not restructure them.
4. Ask before making a call that would lock in an architecture decision affecting a future phase (e.g., picking a P2P library, choosing a specific vector DB).
5. Check `backlog.md` for relevant deferred ideas at the start of each new phase.
6. Update the "Current Build Status" checklist above when a phase is completed.

---

## THE BUILD LOOP (apply this to every phase)

Do not declare a feature "done" without actually running something that proves it. The loop is:

```
1. PLAN  → explain the approach before writing code, especially for anything
           non-trivial (sync logic, dedup, permissions)
2. BUILD → implement it
3. RUN   → execute tests / start the app / call the endpoints for real
4. CHECK → read the actual output — logs, test results, real API responses
5. FIX   → correct based on what actually happened, not assumptions
6. REPEAT until it genuinely passes
7. REPORT → summarize what was verified, with real output, not just
           "this should work"
```

### Loop instructions per phase

**Phase 1 — Foundation**
- Explain the auth flow and schema plan before coding.
- Run `prisma migrate dev` and fix any migration errors.
- Write and run tests for register/login/me — show the actual passing output.
- Call the endpoints directly (curl or a test script) — don't just claim they work.

**Phase 2 — Core Communication Loop**
- After building, simulate the full flow with two test users: send a file, post a message, confirm Inbox status updates.
- Confirm WebSocket events actually fire — show the real event payloads, not just the code that should emit them.
- Debug and re-test until the end-to-end flow is demonstrably working.

**Phase 3 — Local-First Layer**
- Explain the delta-sync and conflict-resolution approach before coding — this is the highest-risk phase for subtle bugs.
- Test: agent goes offline → local edit → agent reconnects → sync resolves correctly. Show before/after state.
- Deliberately test a conflict case (edits on two "devices" while both offline) and show how it resolves.
- Do not proceed if any scenario risks silent data loss.

**Phase 4 — Device & Storage Intelligence**
- Test dedup: upload identical content from two users, confirm one physical file + two ownership references.
- Test the deletion edge case: one user deletes their reference, confirm the underlying file survives if another reference exists.
- Show actual storage state before/after, not just the logic.

**Phase 5 — Enterprise Layer**
- Plan the roles/permissions matrix before coding.
- Test both allowed AND denied cases explicitly — a member attempting an admin action must be rejected, not silently succeed.
- Re-run Phase 2's personal (non-workspace) flow to confirm it still works — this phase must not break the existing MVP.
- Only report the phase done once both old and new flows pass.

### Rules that keep the loop honest
- Always ask for a plan before code on anything with real complexity.
- Demand real execution — tests, curl calls, actual output — never "this should handle that case."
- Explicitly request edge-case and failure-path testing, not just the happy path.
- Say "repeat until it passes" — this licenses iterating instead of stopping at the first attempt.
- End each phase with a report of what was actually verified, not just what was built.

---

## DEV ENVIRONMENT NOTES

Practical setup detail for working in this repo day-to-day — not part of the product vision, just tooling.

- **Package manager:** npm workspaces (root `package.json` → `apps/*`, `packages/*`). Run `npm install` once at the repo root — don't install inside individual app folders.
- **Apps:**
  - `apps/web` (`@nfs/web`) — React 19 + TS + Tailwind v4 + Vite. Dev server: `npm run dev:web` from root → http://localhost:5173, proxies `/api/*` to the API.
  - `apps/api` (`@nfs/api`) — Node + TS + Express + Prisma. Dev server: `npm run dev:api` from root → http://localhost:4000, via `tsx watch`.
  - `packages/shared` (`@nfs/shared`) — shared TS types, consumed by both apps straight from `src` via the workspace symlink (no build step).
- **Database:** Postgres runs on a **shared remote server**, not locally via Docker (`docker-compose.yml`'s Postgres service is commented out — kept only for reference if we go local again later). This project has its own dedicated `nfs` database on that server — **never point `DATABASE_URL` at the `ATS` database or any other database on the same host**, that belongs to a different project. Copy `apps/api/.env.example` → `apps/api/.env` and fill in the real connection string (not committed) before running the API. Prisma schema at `apps/api/prisma/schema.prisma`; regenerate client with `npm run prisma:generate -w @nfs/api`, run migrations with `npm run prisma:migrate -w @nfs/api`.
- **Lint/format:** `npx eslint .` and `npx prettier --check .` from root — one flat ESLint config covers both apps with different rule sets per directory; Prettier ignores `*.md`.
- **Node version used when scaffolding:** Node v24.14.1 / npm 11.11.0.
