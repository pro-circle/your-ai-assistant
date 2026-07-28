# Run & deploy — Flask backend + TypeScript frontend

The app is now two pieces:

| Piece | Tech | Location | Job |
|---|---|---|---|
| Backend | **Flask (Python)** | `backend/app.py` | System prompt, model choice, Groq streaming |
| Frontend | **TypeScript / TanStack Start** | `src/` | UI, RAG in the browser, thin proxy at `/api/chat` |

`src/routes/api/chat.ts` contains **no logic** — it just forwards the request
to Flask (`CHAT_BACKEND_URL`) and streams the response back.
**To change agent behaviour, edit `build_system_prompt()` in `backend/app.py`.**

---

## 1. Run locally

Terminal 1 — Flask:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export GROQ_API_KEY=gsk_your_key_here                 # Windows: set GROQ_API_KEY=...
python app.py                                          # http://127.0.0.1:5001
```

Terminal 2 — frontend:

```bash
bun install        # or npm install
bun run dev        # http://localhost:8080
```

The frontend proxies to `http://127.0.0.1:5001` by default. Check the backend
with `curl http://127.0.0.1:5001/health`.

---

## 2. Deploy the Flask backend (Cloud Run)

Firebase and Cloud Run live in the same Google Cloud project, so this stays
inside Firebase's ecosystem. Requires the **Blaze** plan (see the note at the
bottom).

```bash
gcloud config set project <your-firebase-project-id>

# store the Groq key
echo -n "gsk_your_key_here" | gcloud secrets create GROQ_API_KEY --data-file=-

# build + deploy the container in ./backend
gcloud run deploy dynamic-agent-api \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GROQ_API_KEY=GROQ_API_KEY:latest \
  --timeout 3600
```

Copy the service URL it prints, e.g. `https://dynamic-agent-api-xxxx-uc.a.run.app`.

Verify: `curl https://dynamic-agent-api-xxxx-uc.a.run.app/health`

---

## 3. Deploy the frontend (Firebase App Hosting)

```bash
npm i -g firebase-tools
firebase login
```

1. Put your project ID in `.firebaserc`.
2. Put the Cloud Run URL from step 2 into `apphosting.yaml` → `CHAT_BACKEND_URL`.
3. Create the backend once:

```bash
firebase apphosting:backends:create \
  --project <your-firebase-project-id> \
  --location us-central1
```

Use the backend ID `dynamic-customer-agent` (matches `firebase.json`) and
connect your GitHub repo — pushes then auto-deploy.

4. Manual rollout without a push:

```bash
firebase deploy --only apphosting
```

The live URL appears in the CLI output and under **App Hosting → Backends**.

---

## 4. Update the prompt / backend later

```bash
# edit backend/app.py
gcloud run deploy dynamic-agent-api --source ./backend --region us-central1
```

No frontend redeploy needed.

---

## Notes

- `GROQ_API_KEY` lives **only** in the Flask service. It never reaches the browser.
- Streaming works over Cloud Run; `--timeout 3600` and `X-Accel-Buffering: no`
  keep SSE responses flowing.
- Optional: skip the proxy and let the browser call Flask directly by setting
  `VITE_CHAT_API_URL=https://dynamic-agent-api-xxxx-uc.a.run.app/api/chat` at
  build time. If you do, set `ALLOWED_ORIGINS` on the Flask service to your site
  origin instead of `*`.

## ⚠️ Spark (free) plan

Neither Cloud Run nor App Hosting works on Spark — both need a billing account,
as does Secret Manager. Upgrade to **Blaze** (pay-as-you-go; both services scale
to zero, so idle cost is ~$0 — set a budget alert). Alternatively host the Flask
service on a free Python host (Render, Railway, Fly.io) and point
`CHAT_BACKEND_URL` at it, keeping the frontend anywhere that runs SSR.

**Never** call Groq from the browser to avoid this — the key would leak.
