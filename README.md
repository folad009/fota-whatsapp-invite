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

Generate an auth secret:

```bash
openssl rand -base64 32
# Add as AUTH_SECRET in .env.local and Convex dashboard
```

### 4. Run Next.js

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See [.env.example](./.env.example) for the full list.

Set Twilio and Cloudinary secrets in both `.env.local` (Next.js) and the Convex dashboard (for backend functions).

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
