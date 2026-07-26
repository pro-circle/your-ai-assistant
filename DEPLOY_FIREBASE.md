# Deploy to Firebase App Hosting

This app has a server route (`/api/chat`) that proxies to Groq, so it needs an
SSR-capable host. **Firebase App Hosting** runs the TanStack Start server on
Cloud Run and serves static assets from Firebase's CDN — no manual Cloud
Function wiring required.

## 1. One-time setup

```bash
npm i -g firebase-tools
firebase login
```

Edit `.firebaserc` and replace `your-firebase-project-id` with the actual
Firebase project ID (create one at https://console.firebase.google.com if
needed).

## 2. Store your Groq key as a secret

```bash
firebase apphosting:secrets:set GROQ_API_KEY
# paste the key when prompted
firebase apphosting:secrets:grantaccess GROQ_API_KEY --backend dynamic-customer-agent
```

`apphosting.yaml` already references this secret at runtime.

## 3. Create the backend (first deploy only)

```bash
firebase apphosting:backends:create \
  --project <your-firebase-project-id> \
  --location us-central1
```

When it asks for a backend ID, use `dynamic-customer-agent` (matches
`firebase.json`). Connect it to your GitHub repo when prompted — App Hosting
will auto-deploy on push to the branch you pick.

## 4. Deploy

Every push to the connected branch redeploys automatically. To trigger a
manual rollout without a push:

```bash
firebase deploy --only apphosting
```

The live URL is shown in the CLI output and in the Firebase console under
**App Hosting → Backends**.

## Notes

- `vite build` runs on Firebase's build server; nothing to do locally.
- `GROQ_API_KEY` is only injected at runtime — it never touches the browser bundle.
- To use a custom domain: **App Hosting → Backend → Add custom domain**.

---

## ⚠️ Spark (free) plan — read this first

**Firebase App Hosting does NOT work on the Spark plan.** App Hosting builds with
Cloud Build and runs on Cloud Run; both require a billing account, so
`firebase apphosting:backends:create` fails on Spark with a billing error.
Secret Manager (used for `GROQ_API_KEY`) also requires Blaze.

You have two options:

### Option A — upgrade to Blaze (recommended, still ~free here)
Blaze is pay-as-you-go with a free monthly allowance. For this app
(`minInstances: 0`, so it scales to zero when idle) low traffic typically costs
$0–1/month. Set a budget alert in the Google Cloud console to stay safe.
Then follow steps 1–4 above unchanged.

### Option B — stay on Spark
Spark only gives you **static Firebase Hosting**, which cannot run the
`/api/chat` Groq proxy. That means you must either:

1. Host the whole app somewhere with a free SSR tier (Cloudflare Workers,
   Vercel, Netlify) — the app is a standard TanStack Start SSR app, so
   `vite build` output deploys as-is; or
2. Keep Firebase Hosting for the static build and point the chat client at an
   externally hosted `/api/chat`.

**Never** call Groq directly from the browser to work around this — that would
expose `GROQ_API_KEY` to every visitor.
