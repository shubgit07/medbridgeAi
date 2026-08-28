# MedBridge 

> **Turning pharmacy dead stock into live revenue.**

MedBridge is a hyperlocal B2B SaaS platform connecting licensed pharmacies to trade near-expiry medicines at a discount before they become write-offs. It features a PostGIS-powered spatial matching engine, dynamic sigmoid pricing decay, OCR/GS1 barcode parsing, real-time WebSocket push notifications, and BullMQ background workers for automated expiry alerts.

---

## 🏗️ Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│       React / Next.js Web App (Pharmacy Dashboard)              │
│       (Listings, Real-Time WS Notifications, Orders)            │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS / WebSockets
┌──────────────────────▼──────────────────────────────────────────┐
│                    FASTIFY BACKEND (Node.js + TS)               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │  Auth Module │ │Listing Module│ │    Matching Engine       │ │
│  │  (JWT + RBAC)│ │(CRUD + Expiry│ │  (Urgency Score + Geo)   │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Order Module │ │ OCR Module   │ │  Notification Service    │ │
│  │(Escrow Logic)│ │(Label Parsing│ │(WebSocket + BullMQ Queue)│ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└───────┬──────────────────┬──────────────────────┬───────────────┘
        │                  │                      │
┌───────▼──────┐   ┌───────▼──────┐   ┌───────────▼───────────┐
│  PostgreSQL  │   │    Redis     │   │   BullMQ Workers      │
│  + PostGIS   │   │  (Queue +    │   │  (Daily Expiry Alerts,│
│ (Drizzle ORM)│   │   Cache)     │   │   Urgency Refresh)    │
└──────────────┘   └──────────────┘   └───────────────────────┘
```

### Backend (`/backend`)
- **Framework:** Fastify (TypeScript)
- **Database ORM:** Drizzle ORM + PostgreSQL (with PostGIS spatial geography support)
- **Task Queue:** BullMQ + Redis
- **Authentication:** JWT (`@fastify/jwt`) with hashed passwords
- **WebSockets:** Native WebSocket server via `@fastify/websocket`
- **Validation:** Zod

### Frontend (`/frontend`)
- **Framework:** Next.js (React)
- **API Client:** Axios with JWT auto-attachment and 401 interceptors

---

## ⚡ Core Technical Features

1. **Urgency-Weighted Spatial Matching Engine:**
   Scores candidate buyer pharmacies within 10 km based on days to expiry (exponential decay), distance, locality demand signal, and seller trust score:
   $$\text{Urgency Score} = 0.40 \cdot e^{-0.02 \cdot \text{days}} + 0.25 \cdot \left(\frac{1}{1 + \text{distance}}\right) + 0.25 \cdot \text{demand} + 0.10 \cdot \text{trust}$$

2. **Sigmoid Dynamic Expiry-Decay Pricing:**
   Automatically computes suggested discounts deepening as expiry approaches :

3. **Regulatory Compliance Layer:**
   - **Form 20/21 License Verification:** Unverified pharmacies cannot trade.
   - **Schedule X / Narcotic Exclusion:** Database and endpoint guards prevent controlled substance trading.
   - **Form 19 Invoice Gate:** Orders cannot be marked `delivered` without a valid purchase invoice URL.

4. **Background Alert Workers (BullMQ):**
   - Automated daily 9 AM expiry alerts (T-90, T-60, T-30, T-7 days).
   - Real-time WebSocket push notifications to candidate buyers when new matching stock is listed.

---

## 🚀 Getting Started

### 1. Backend Setup (`/backend`)
```bash
cd backend
npm install
npm run dev
```

Environment Variables (`.env`):
```env
PORT=8000
DATABASE_URL=postgresql://user:pass@localhost:5432/medbridge
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secure-jwt-secret
```

### 2. Frontend Setup (`/frontend`)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
