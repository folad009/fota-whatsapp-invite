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


| | Sandbox | Production |
|---|---------|------------|
| From number | +1 415 523 8886 | +1 832 274 6672 |
| Recipients | Must send `join <code>` first | Any WhatsApp user |
| Use for | Dev testing | Live events |
