# Roza FM Suite

Enterprise facility management ERP — multi-tenant SaaS with dynamic register builder, AI assistant, billing, and real-time dashboards.

Built with Next.js 16 + TypeScript + Prisma (PostgreSQL) + shadcn/ui + Tailwind CSS 4.

## 🚀 One-Click Deploy

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/muhammadtahirmunawarali-hub/roza-fm-suite&env=DATABASE_URL&envDescription=Your%20Neon%20Postgres%20connection%20string&project-name=roza-fm-suite&repository-name=roza-fm-suite)

## What you get

- **48 modules** — Work Orders, Assets, PM, Inventory, Vendors, Contracts, HR, Safety, and more
- **Multi-tenant** — each company's data is isolated by `tenantId` at the database query layer
- **AI Assistant** — natural-language CRUD (create records, search, get insights via voice)
- **Billing** — Stripe checkout + customer portal + webhook sync
- **Email onboarding** — Resend integration (welcome email with credentials)
- **File storage** — Cloudflare R2 (S3-compatible, no egress fees)
- **3 languages** — English, Arabic (RTL), French
- **6 themes** + 7 accent colors + blur/screenshot mode
- **PWA** — installable, offline-capable

## Demo logins

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Super Admin |
| `john` | `john123` | Manager |
| `ahmed` | `ahmed123` | Technician |
| `fatima` | `fatima123` | HR |
| `priya` | `priya123` | Accountant |

> ⚠️ Set `NEXT_PUBLIC_SHOW_DEMO_LOGIN=false` in production to hide these quick-login buttons.

## Setup (5 minutes)

1. **Database** — Create a free [Neon](https://neon.tech) Postgres database → copy the connection string
2. **Deploy** — Click the "Deploy to Vercel" button above → paste your `DATABASE_URL` → deploy
3. **Done** — The app auto-creates all tables + seeds demo data on first load

### Optional integrations (add anytime via Vercel env vars)

| Service | Env vars | Purpose |
|---|---|---|
| [Cloudflare R2](https://dash.cloudflare.com) | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | File uploads (WO attachments, photos) |
| [Stripe](https://stripe.com) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE` | Subscription billing |
| [Resend](https://resend.com) | `RESEND_API_KEY`, `EMAIL_FROM` | Transactional emails (onboarding) |

All optional — the app gracefully falls back to local/dev mode without them.

## Tech stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Database**: PostgreSQL (Neon) + Prisma 6 ORM
- **UI**: shadcn/ui (New York) + Tailwind CSS 4 + Lucide icons
- **State**: Zustand (client) + TanStack Query (server)
- **Auth**: Cookie-based sessions + bcrypt password hashing
- **AI**: z-ai-web-dev-sdk (LLM, VLM, image generation, TTS, ASR)

## License

Proprietary — © Roza FM Suite
