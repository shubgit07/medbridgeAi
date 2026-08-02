# MedBridge Project Progress

Last updated: 2026-08-02

## Overview
MedBridge is a hyperlocal B2B near-expiry medicine marketplace built with a Fastify + TypeScript + Drizzle ORM backend, BullMQ background alert workers, PostGIS spatial matching, and a Next.js frontend (`frontend`).

## Repository Layout
- `backend/`: Fastify + TypeScript backend application
  - `src/db/`: Drizzle ORM schema definitions and PostgreSQL connection pool
  - `src/modules/`: Auth, Pharmacies, Drugs, Listings, Orders, and OCR modules
  - `src/jobs/`: BullMQ queues and background alert workers
  - `src/websocket/`: Real-time WebSocket notification server (`/ws/notifications`)
  - `src/utils/`: Dynamic pricing decay math & composite urgency scoring
- `frontend/`: Next.js web application frontend

## Completed Architecture & Progress
- [x] Fastify application setup with `@fastify/cors` (proper origin & credentials handling), `@fastify/jwt`, and `@fastify/websocket`.
- [x] Secure password hashing using SHA-256 (`hash.ts`) replacing legacy plain-text storage.
- [x] Drizzle ORM schemas with PostGIS geography spatial points, generated discount columns, and Schedule X safety flags.
- [x] Dynamic Sigmoid expiry decay pricing algorithm ($\text{Midpoint} = 45\text{ days}, k = -0.08$).
- [x] Urgency-weighted spatial matching engine scoring candidate buyers within 10 km.
- [x] BullMQ background worker system with daily 9 AM expiry alert crons (T-90, T-60, T-30, T-7 days).
- [x] Real-time WebSocket notification streaming (`/ws/notifications`).
- [x] Orders state machine with Form 19 invoice gate compliance.
- [x] Next.js frontend API client (`frontend/lib/api.ts`) with automatic JWT bearer token handling and 401 interceptors.

## Resolved Tech Debt
- **CORS Vulnerability:** Resolved by moving from wildcards to environment-driven CORS configuration with credentials support in Fastify.
- **Plain-text Passwords:** Resolved via SHA-256 hashing utility.
- **Unverified Tokens:** Resolved via `@fastify/jwt` bearer token validation hooks.
