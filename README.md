# book-a-glow — NextSlot

Multi-tenant beauty booking platform built with:

- **Vite + React + TypeScript**
- **Tailwind CSS + shadcn-ui**
- **Supabase** (Postgres, Auth, Realtime)
- **Vercel** (hosting + env vars)

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + shadcn-ui |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Payments | Yoco |

## Environment Variables

Copy `.env.example` to `.env` and fill in values. Required for local dev:

```
VITE_FOUNDER_TENANT_IDS=<comma-separated tenant UUIDs>
```

All production env vars are set in the Vercel dashboard.

## Local Development

```sh
git clone <YOUR_GIT_URL>
cd book-a-glow
npm install
npm run dev
```
