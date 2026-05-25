# Fluxo Inteligente

Sistema Inteligente de Organização Escolar — controle de filas no refeitório via QR Code com totem escolar e painel administrativo.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/fluxo-inteligente run dev` — run the frontend (port 23501)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema (classes, students, meal_slots, checkins)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/fluxo-inteligente/src/pages/` — React pages
- `artifacts/fluxo-inteligente/src/components/` — Shared components (Sidebar)

## Architecture decisions

- Contract-first API: OpenAPI spec gates codegen, which gates the frontend
- QR Code stored as generated string per student (`QR-{registration}-{timestamp}`)
- Meal slot access check: compares current HH:MM against slot start/end times and weekday
- Scan endpoint (`POST /api/checkins/scan`) creates a checkin record regardless of outcome (allowed/denied/no_slot) for full audit trail

## Product

- **Landing page** (`/`): explains the system with hero, problem/solution/benefits cards, and how-it-works steps
- **Totem** (`/totem`): fullscreen kiosk UI for simulating QR Code scans — select a student, click "Ler QR Code", get instant visual feedback (green=allowed, red=denied)
- **Dashboard** (`/dashboard`): stats (total students, today's checkins, classes, weekly checkins), today's schedule with slot occupancy, recent check-in feed
- **Alunos** (`/alunos`): searchable/filterable student CRUD with class assignment
- **Turmas** (`/turmas`): class management with student counts
- **Horarios** (`/horarios`): meal slot scheduling by class, time window, and weekdays

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always re-run codegen after changing the OpenAPI spec: `pnpm --filter @workspace/api-spec run codegen`
- Meal slot `weekDays` field stores comma-separated day numbers (0=Sun, 1=Mon, ..., 6=Sat)
- The scan endpoint checks current time vs slot time using HH:MM string comparison

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
