# NFS — Backlog

Ideas, requests, and "wouldn't it be cool if..." thoughts get parked here — not built immediately, so we don't break phase discipline. Review this file at the start of each new phase to see what's now in scope.

Move an item to the current phase's todo list only when you deliberately decide it belongs there — not mid-task.

---

## How to use this file

1. Idea comes up while building something else → add a one-line entry below under the right phase.
2. Don't build it now. Finish the current task first.
3. At the start of a new phase, scan this file for anything that now applies.
4. Once actually built, move the line into CLAUDE.md's changelog / mark it done here.

---

## Unsorted / Not Yet Triaged

- (add new raw ideas here as they come up — sort them below later)

---

## Phase 1 — Foundation

- [ ] SSO / OAuth login (deferred — email/password only for MVP)
- [ ] Password reset flow
- [ ] Rate limiting on auth endpoints

---

## Phase 2 — Core Communication Loop

- [ ] File preview (PDF/image inline viewer) instead of download-only
- [ ] @mentions in conversation threads
- [ ] Typing indicators in conversation view
- [ ] Recall / unsend a sent file
- [ ] Expiring file links

---

## Phase 3 — Local-First Layer

- [ ] Electron GUI for the agent (instead of CLI-only)
- [ ] Bandwidth throttling controls for sync
- [ ] Selective sync (choose which files/folders to cache locally)

---

## Phase 4 — Device & Storage Intelligence

- [ ] True peer-to-peer transfer (WebRTC) between devices on same LAN
- [ ] Device trust scoring (beyond simple trusted/untrusted flag)
- [ ] Remote wipe / remote lock for lost devices
- [ ] Storage tiering rules (auto-archive files older than N days)

---

## Phase 5 — Enterprise Layer

- [ ] Multi-tenant SaaS support (org-level isolation)
- [ ] Full RBAC/ABAC policy engine
- [ ] DLP (data loss prevention) rules
- [ ] Compliance certifications tooling (GDPR/HIPAA/SOC2 audit exports)
- [ ] External partner/guest portal
- [ ] Developer API keys + webhooks + SDK

---

## AI / Search (future — not yet phased)

- [ ] Semantic search ("find last year's contracts")
- [ ] Auto-tagging / classification
- [ ] OCR for scanned documents
- [ ] Duplicate/inactive file suggestions

---

## Explicitly Rejected / Out of Scope for Now

Use this to record things considered and deliberately deferred, so they don't get re-proposed and re-debated every few weeks.

- (nothing yet — add here as decisions are made)
