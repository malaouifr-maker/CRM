# Review Scope

## Target

ARCHITECTURE.md — Technical architecture document for the CRM Dashboard project.

## Files

- `/Users/mac/Documents/Claude projet/CRM/ARCHITECTURE.md`
- `/Users/mac/Documents/Claude projet/CRM/PRD.md` (for cross-reference context)

## Flags

- Security Focus: no
- Performance Critical: no
- Strict Mode: no
- Framework: Next.js 14 (App Router)

## Review Phases

1. Code Quality & Architecture
2. Security & Performance
3. Testing & Documentation
4. Best Practices & Standards
5. Consolidated Report

## Key Context

This is a client-side CRM dashboard application using:
- Next.js 14 (App Router)
- Tailwind CSS v3
- shadcn/ui + Radix UI + TanStack Table v8
- Recharts v2
- Papa Parse v5 (CSV parsing in browser)
- Zustand v4 (global state)
- date-fns v3
- Lucide React
- Deployed on Vercel

The app parses CSV exports from a CRM and displays pipeline, forecast, marketing, and deal data across 5 routes.
