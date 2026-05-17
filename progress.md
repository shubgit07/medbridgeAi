# MediRelife Project Progress

Last updated: 2026-05-16

## Overview
MediRelife is a medicine inventory system with a FastAPI backend, a Next.js frontend, and an optional Streamlit admin UI. It supports basic auth, medicine ingestion (manual and OCR), and inventory search.

## Repository layout
- main.py: FastAPI app and API endpoints
- database.py: SQLAlchemy engine and session
- models.py: ORM models for users, medicines, inventory
- LLM/extraction.py: OCR text to structured medicine data using LangChain + Hugging Face
- app.py: Streamlit admin UI for adding and searching medicines
- pharma-ui/: Next.js web app

## Architecture
- Backend: FastAPI + SQLAlchemy (PostgreSQL via SUPABASE_URL)
- LLM extraction: Hugging Face endpoint (HF_TOKEN) invoked through LangChain
- OCR: Frontend uses Tesseract.js to extract text and posts to /extract-medicine
- Web UI: Next.js app in pharma-ui, Axios client in lib/api.js

## API endpoints
- POST /extract-medicine: Parse OCR text into structured medicine data
- POST /insert-full: Insert medicine and inventory together
- POST /signup: Create a user
- POST /login: Authenticate a user
- POST /user: Create a user (legacy endpoint)
- GET /search: Search medicines and active inventory

## Data model
- User: pharmacy account (name, email, password)
- Medicine: brand, generic name, dosage, manufacturer, owner
- Inventory: stock, expiry, price, owner, medicine

## Environment configuration
- SUPABASE_URL: PostgreSQL connection string
- HF_TOKEN: Hugging Face token used for LLM extraction

## Local setup
1. Backend
   - Create and activate a virtual environment
   - Install dependencies: pip install -r pharma-ui/requirements.txt
   - Run API: uvicorn main:app --reload
2. Streamlit (optional)
   - Run: streamlit run app.py
3. Frontend
   - cd pharma-ui
   - npm install
   - npm run dev
4. Confirm backend at http://127.0.0.1:8000

## Current progress
- Done
  - Core FastAPI app and SQLAlchemy models
  - OCR to LLM extraction pipeline
  - Basic auth endpoints
  - Next.js scaffold, auth pages, dashboard, scan flow
- In progress
  - Inventory and search UI pages (placeholders)
  - End-to-end token-based auth (partial)
- Planned
  - Proper JWT auth and token validation
  - Password hashing
  - Environment-based API base URL for frontend
  - Tests and basic CI

## Known issues and tech debt
- JWT utilities are partially implemented but not wired up
- Login returns user id as access_token, not a real JWT
- Passwords are stored in plain text
- CORS allows all origins
- Inventory and search pages do not call the backend yet
- Base URL for API calls is hardcoded

## Contribution notes
- Add backend routes in main.py and update models in models.py
- Keep API client changes centralized in pharma-ui/lib/api.js
- Consider moving requirements.txt to the repository root for clarity
