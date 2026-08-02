# MediRelife Frontend (`frontend`) — Developer Guide

## 🚀 Common Commands
* **Run Dev Server**: `npm run dev` (Runs Next.js with Turbopack)
* **Build Production Bundle**: `npm run build`
* **Start Production Server**: `npm run start`
* **Lint Codebase**: `npm run lint` (ESLint)
* **Auto-Fix Lint Errors**: `npm run lint:fix`
* **TypeScript Type Check**: `npm run type-check`
* **Clear Next.js Cache**: `npm run clean` (Deletes `.next/` cache safely)

---

## 🛠️ System Architecture & Architecture Rules
1. **API Client (`@/lib/api.ts`)**:
   * Powered by **Axios** with global interceptors.
   * Auto-attaches JWT token from `localStorage` under headers as `Bearer <token>`.
   * Automatically redirects to `/signin` on any `401 Unauthorized` response.
   * Reads from `NEXT_PUBLIC_API_URL` env variable. Fallback: `http://127.0.0.1:8000`.

2. **Environment Configuration (`.env.local`)**:
   * Manage local environment variables here. **Never commit `.env.local` to git**.

3. **Relative Imports**:
   * Avoid long, fragile relative imports (e.g., `../../../../lib/...`).
   * **Always use `@/` alias** (e.g., `import API from "@/lib/api"`). Configured in `tsconfig.json`.

4. **Performance & Bundle Size Guidelines**:
   * **Do not import heavy external libraries eagerly at the top-level** (e.g., `tesseract.js`, scanner frameworks).
   * Utilize `next/dynamic` with `ssr: false` to lazy-load components or dynamic `await import()` on demand.
   * Use CSS-based layout styles matching `/app/globals.css` variable system to avoid style processing delays.
