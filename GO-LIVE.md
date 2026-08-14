# Go live checklist

Production URLs:
- **App:** https://fota-whatsapp-invite.vercel.app
- **Convex:** https://fiery-roadrunner-823.convex.cloud
- **Convex webhook:** https://fiery-roadrunner-823.convex.site/twilio/webhook
- **WhatsApp sender:** +1 832 274 6672

## 1. Convex production env

Run from project root:

```bash
npx convex env set --prod TWILIO_WHATSAPP_FROM "whatsapp:+18322746672"
npx convex env set --prod NEXT_PUBLIC_APP_URL "https://fota-whatsapp-invite.vercel.app"
npx convex env set --prod SITE_URL "https://fota-whatsapp-invite.vercel.app"
```

Verify Twilio content SIDs and credentials are set on prod (same account as dev).

## 2. Deploy backend

```bash
npx convex deploy
```

## 3. Vercel env (Production)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://fiery-roadrunner-823.convex.cloud` |
| `NEXT_PUBLIC_APP_URL` | `https://fota-whatsapp-invite.vercel.app` |
| Cloudinary vars | same as dev |

Redeploy Vercel after changing env vars.

## 4. Twilio WhatsApp sender

In **Twilio Console → Messaging → Senders → WhatsApp senders → +18322746672**:

1. **Webhook URL (incoming + status):**  
   `https://fiery-roadrunner-823.convex.site/twilio/webhook`
2. Method: **POST**
3. Confirm all 4 content templates are **Approved** for this sender (not sandbox only).

## 5. Admin user (prod)

```bash
npx convex run --prod users:createInitialAdmin '{"name":"Admin","email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}'
```

Or bootstrap an existing account:

```bash
npx convex run --prod users:bootstrapAdmin '{"email":"YOUR_EMAIL"}'
```

## 6. Smoke test

1. Sign in at https://fota-whatsapp-invite.vercel.app/sign-in
2. Create event with banner image
3. Send invite to a real phone (no sandbox join needed on production)
4. Open registration link from WhatsApp
5. Confirm RSVP WhatsApp confirmation arrives

## Twilio media template (event invite)

Your template media URL should be:

```text
https://res.cloudinary.com/dfbd7mn3p/image/upload/{{1}}.jpg
```

Sample for `{{1}}`:

```text
event-banners/vfjutiaqsbkszqs5f9kz
```

Do **not** hardcode a Cloudinary version (`v1786462327`) in the template — new uploads get new versions and media will fail with error **63019**.

If your template uses `.../event-banners/{{1}}` instead, the app sends the filename only (e.g. `vfjutiaqsbkszqs5f9kz.jpg`).

## Local dev (localhost + sandbox)

`.env.local` should use **dev** Convex and sandbox:

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_CONVEX_URL` | `https://adorable-minnow-162.convex.cloud` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` |

Dev Convex env (sync template SIDs from `.env.local` — stale SIDs cause **Content was not found**):

```bash
npx convex env set TWILIO_WHATSAPP_FROM "whatsapp:+14155238886"
npx convex env set NEXT_PUBLIC_APP_URL "http://localhost:3000"
npx convex env set TWILIO_CONTENT_EVENT_INVITE "HXcf6831be02490cde95ece1dbf68fd335"
npx convex env set TWILIO_CONTENT_TEXT_FALLBACK "HX7769f1b14e23c95c37b22aba6e5869a8"
npx convex env set TWILIO_CONTENT_RSVP_CONFIRM "HXb9e51e42539f8f34bf365d9c469c858a"
npx convex env set TWILIO_CONTENT_REMINDER "HX9739bce19937da7613b6cfa0e850a263"
```

Run `npx convex dev` + `npm run dev`. Each test phone must send `join <code>` to **+1 415 523 8886** once.

Production (Vercel / prod Convex) stays on `+18322746672` and the Vercel URL.

## WhatsApp Utility templates (fix error 63049)

Error **63049** means Meta blocked a **Marketing** template. Recreate (or resubmit) all templates as **Utility** — event invites, confirmations, and reminders are transactional, not promotional.

**Rules for Meta Utility approval:**
- No sales language (“Don’t miss out”, “Limited time”, emojis selling the event)
- State facts: event name, date, location, registration/confirmation action
- Longer body text when using many variables (avoids rejection code 2388293)
- Category: **Utility** (not Marketing)
- After approval, update Content SIDs in Convex env

---

### Template 1 — Event invite with image

| Field | Value |
|-------|--------|
| **Name** | `event_invite_utility` |
| **Type** | WhatsApp Card (media + body + URL button) |
| **Category** | **Utility** |
| **Language** | English |

**Media URL:**
```text
https://res.cloudinary.com/dfbd7mn3p/image/upload/{{1}}.jpg
```

**Body:**
```text
Hey {{2}},

You have been invited to register for the following event:

Event: {{3}}
About: {{7}}
Date and time: {{4}}
Location: {{5}}

Please tap the button below to complete your registration.
```

**Button:** `Register`  
**Button URL:**
```text
https://fota-whatsapp-invite.vercel.app/r/{{6}}
```

**Sample variables:**

| Var | Sample |
|-----|--------|
| `{{1}}` | `event-banners/vfjutiaqsbkszqs5f9kz` |
| `{{2}}` | `John Smith` |
| `{{3}}` | `Sunday Service at FOTA` |
| `{{4}}` | `Sun, Aug 16, 7:00 AM` |
| `{{5}}` | `40 Imam Dauda Street, Surulere, Lagos` |
| `{{6}}` | `abc123def456` |
| `{{7}}` | `Join us for worship and fellowship. All are welcome.` |

**Convex env:** `TWILIO_CONTENT_EVENT_INVITE=HX...`

**App sends:** `"1"` media path, `"2"`–`"5"` name/title/date/location, `"6"` token only, `"7"` event description (or `No additional details provided.` if empty).

---

### Template 2 — Text fallback invite (no image)

| Field | Value |
|-------|--------|
| **Name** | `event_invite_text_utility` |
| **Type** | Text |
| **Category** | **Utility** |

**Body:**
```text
Hello {{1}},

You are invited to register for {{2}}.

Event details:
Date and time: {{3}}
Location: {{4}}

Complete your registration here:
{{5}}
```

**Sample variables:**

| Var | Sample |
|-----|--------|
| `{{1}}` | `John Smith` |
| `{{2}}` | `Sunday Service at FOTA` |
| `{{3}}` | `Sun, Aug 16, 7:00 AM` |
| `{{4}}` | `40 Imam Dauda Street, Surulere, Lagos` |
| `{{5}}` | `https://fota-whatsapp-invite.vercel.app/r/abc123def456` |

**Convex env:** `TWILIO_CONTENT_TEXT_FALLBACK=HX...`

**App sends:** `"5"` is the **full registration URL**.

---

### Template 3 — RSVP confirmation

| Field | Value |
|-------|--------|
| **Name** | `rsvp_confirmation_utility` |
| **Type** | Text |
| **Category** | **Utility** |

**Body:**
```text
Hello {{1}},

This message confirms your registration for {{2}} on {{3}}.

Please save this confirmation for your records. We look forward to seeing you at the event.
```

**Sample variables:**

| Var | Sample |
|-----|--------|
| `{{1}}` | `John Smith` |
| `{{2}}` | `Sunday Service at FOTA` |
| `{{3}}` | `Sun, Aug 16, 7:00 AM` |

**Convex env:** `TWILIO_CONTENT_RSVP_CONFIRM=HX...`

---

### Template 4 — Attendance reminder

| Field | Value |
|-------|--------|
| **Name** | `attendance_reminder_utility` |
| **Type** | Text |
| **Category** | **Utility** |

**Body:**
```text
Reminder for your registered event:

Event: {{1}}
Date and time: {{2}}

Please reply YES to confirm you will attend, or NO if you cannot make it.
```

**Sample variables:**

| Var | Sample |
|-----|--------|
| `{{1}}` | `Sunday Service at FOTA` |
| `{{2}}` | `Sun, Aug 16, 7:00 AM` |

**Convex env:** `TWILIO_CONTENT_REMINDER=HX...`

---

### After templates are approved

1. Copy each new **Content SID** (`HX...`) from Twilio.
2. Update **prod** Convex:
   ```bash
   npx convex env set --prod TWILIO_CONTENT_EVENT_INVITE "HX..."
   npx convex env set --prod TWILIO_CONTENT_TEXT_FALLBACK "HX..."
   npx convex env set --prod TWILIO_CONTENT_RSVP_CONFIRM "HX..."
   npx convex env set --prod TWILIO_CONTENT_REMINDER "HX..."
   ```
3. Update **dev** Convex the same way if testing locally.
4. Wait **24+ hours** before resending to numbers that hit 63049 (Meta per-user limits).
5. Send in **small batches** — avoid many resends to the same contacts in minutes.

### If Meta recategorized you to Marketing

1. [Meta Business Manager](https://business.facebook.com) → WhatsApp Manager → **Message templates**
2. Select template → **Request review** → ask for **Utility** category
3. Or create **new** templates with the copy above (new names) and submit as Utility

### Optional: Marketing Messages API

Only needed if you intentionally keep Marketing templates: WhatsApp Manager → **Overview** → **Alerts** → accept Marketing Messages API terms.


| | Sandbox | Production |
|---|---------|------------|
| From number | +1 415 523 8886 | +1 832 274 6672 |
| Recipients | Must send `join <code>` first | Any WhatsApp user |
| Use for | Dev testing | Live events |
