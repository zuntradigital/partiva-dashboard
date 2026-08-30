# Partiva Dashboard

Admin CMS for managing all content shown on the Partiva public Website: articles, pages/sections, pricing, FAQ, testimonials, contact info, media, and users/roles/permissions.

## Features

- Full Arabic/English UI with RTL/LTR support and persisted language preference
- Dark/light theme, persisted preference
- Role-based access control: built-in roles plus custom roles and per-user permission grants, managed from the UI
- Article editor (rich-text blocks, cover image, SEO fields, translation status, publish workflow)
- Pages & Sections editor, Media Library, Pricing (draft → review → approve), FAQ, Testimonials, Contact info
- Audit log of all admin actions
- Global search across navigation

## Tech Stack

- Next.js (App Router), React, TypeScript
- Tailwind CSS

## Project Structure

```
src/
  app/            # routes ((dashboard) route group = authenticated app, plus /login, /accept-invitation)
  components/     # layout, blog editor, media, users, shared UI primitives
  lib/            # api client, session/auth storage, i18n, permission helpers
  types/          # shared TypeScript types
```

## Requirements

- Node.js 20+
- A running instance of the Partiva Admin Backend (see that project's README)

## Installation

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API |
| `NEXT_PUBLIC_WEBSITE_URL` | Public Website origin (used for the sidebar logo and media asset resolution) |

## Development

```bash
npm run dev     # Next.js dev server
npm run lint    # ESLint
```

## Build / Production

```bash
npm run build
npm start
```

## Architecture Notes

- Auth is a JWT issued by the backend, stored in `localStorage` and sent as a `Bearer` token; `src/lib/session.tsx` derives the current user/permissions from it.
- `can()` (client-side permission check) is a UX convenience only — the backend independently re-verifies every request; the Dashboard never assumes client-side checks are authoritative.
- Translation strings live in a single centralized dictionary (`src/lib/i18n.tsx`); UI chrome is translated there, while actual content (articles, pages, etc.) carries its own `ar`/`en` fields from the API.

## Deployment Notes

- Requires `NEXT_PUBLIC_API_URL` to point at the deployed backend and `NEXT_PUBLIC_WEBSITE_URL` at the deployed Website.
- Standard Next.js production deployment (`next build` + `next start`, or a platform like Vercel).
