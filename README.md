# FeasiAI Frontend

AI-powered California property feasibility analysis and permit review.

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, shadcn/ui, Tailwind CSS 4
- **Auth**: Supabase SSR
- **Payments**: Stripe
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Purpose |
|----------|---------|
| `SERVER_URL` | Backend API URL (server-side proxy target) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `FRONTEND_URL` | This app's public URL |

## Deployment

This app is designed for Vercel:

```bash
vercel deploy --prod
```

Set all environment variables from `.env.example` in the Vercel dashboard.

## Backend

This frontend proxies API calls through Next.js API routes to the backend server. The backend is deployed separately — only the `SERVER_URL` environment variable needs to point to it.
