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
