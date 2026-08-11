# WhatsApp Event Invite App

Send WhatsApp event invites with banner images, collect web registrations, and confirm attendance via automated reminders.

## Stack

- **Next.js 15** — frontend + API routes
- **Convex** — backend, database, crons, webhooks
- **Convex Auth** — organizer email/password auth
- **Twilio** — WhatsApp messaging
- **Cloudinary** — event banner images

## Quick start

### 1. Prerequisites

See [PREREQUISITES.md](./PREREQUISITES.md) for Twilio template setup and account creation.

### 2. Install

```bash
npm install
cp .env.example .env.local
# Fill in all environment variables
```

### 3. Run Convex

```bash
npx convex dev
```

This creates your Convex deployment and writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`.

Set up Convex Auth (JWT keys on your deployment):

```bash
npx @convex-dev/auth
```

For production, run the same command with `--prod` (or copy `JWT_PRIVATE_KEY`, `JWKS`, and `SITE_URL` from dev to prod in the Convex dashboard).

### 4. Run Next.js

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See [.env.example](./.env.example) for the full list.

Set Twilio and Cloudinary secrets in both `.env.local` (Next.js) and the Convex dashboard (for backend functions).

### Vercel (production frontend)

Set these in **Vercel → Project → Settings → Environment Variables**, then **redeploy** (required for `NEXT_PUBLIC_*` vars):

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://fiery-roadrunner-823.convex.cloud` (your **prod** Convex URL) |
| `NEXT_PUBLIC_APP_URL` | `https://fota-whatsapp-invite.vercel.app` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | your Cloudinary cloud name |
| `CLOUDINARY_CLOUD_NAME` | same cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

Do **not** use the dev Convex URL (`adorable-minnow-162`) on Vercel.

On **Convex production** deployment, also set:

- `JWT_PRIVATE_KEY` + `JWKS` — run `npx @convex-dev/auth --prod`
- `SITE_URL` — `https://fota-whatsapp-invite.vercel.app` (your Vercel URL)
- `NEXT_PUBLIC_APP_URL` — same Vercel URL
- Twilio vars (same as dev)

## Deployment

See [DEPLOY.md](./DEPLOY.md) for production deployment steps.

## Features

- Create events with Cloudinary banner upload
- Bulk invite via paste or CSV
- WhatsApp invites with image templates
- Public registration at `/r/[token]`
- RSVP confirmation via WhatsApp
- Automated 24h attendance reminders (cron)
- Manual reminder trigger from dashboard
- YES/NO reply handling via Twilio webhook
- Real-time RSVP stats and CSV export
