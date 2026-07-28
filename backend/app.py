"""
Dynamic Customer Agent — Flask backend.

This is the ONLY place with backend logic. The TypeScript route
(src/routes/api/chat.ts) is a thin pass-through proxy to this service.

Endpoints
  GET  /health      -> {"ok": true}
  POST /api/chat    -> Server-Sent Events stream (OpenAI/Groq delta format)

Environment
  GROQ_API_KEY      required
  PORT              optional (default 5001 locally, 8080 on Cloud Run)
  ALLOWED_ORIGINS   optional, comma separated (default "*")

=====================================================================
 SYSTEM PROMPT LIVES IN build_system_prompt() BELOW — edit it there.
=====================================================================
"""

import json
import os

import requests
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Default text model; the vision model is used automatically when a file is
# attached in chat.
TEXT_MODEL = "llama-3.3-70b-versatile"
VISION_MODEL = "qwen/qwen3.6-27b"

MAX_ATTACHMENT_CHARS = 60_000
MAX_DOMAIN_CHARS = 300

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": os.environ.get("ALLOWED_ORIGINS", "*").split(",")}},
)


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------
def build_system_prompt(context_chunks, output_language, domain, has_attachment):
    context_block = ""
    if context_chunks:
        joined = "\n---\n".join(
            f"[Chunk {i + 1}]\n{c}" for i, c in enumerate(context_chunks)
        )
        context_block = (
            "\n\nRelevant excerpts from the user's uploaded documents:\n"
            f"---\n{joined}\n---"
        )

    language_directive = (
        f"Always reply in {output_language}, regardless of the language the user writes in."
        if output_language
        else "Detect the language of the user's most recent message and reply in exactly that language."
    )

    domain_directive = ""
    if domain:
        domain_directive = (
            f' You operate specifically as a "{domain}". Stay in that role at all times: '
            "use its vocabulary, priorities, and typical workflows, and frame every answer "
            "from that domain's perspective."
        )

    no_docs_directive = ""
    if not context_block and not has_attachment:
        no_docs_directive = (
            " No documents have been uploaded yet, so handle only basic, general queries: "
            "keep answers short and high level, and do not invent product-, policy-, or "
            "company-specific details. End such replies with one short friendly line inviting "
            "the user to upload a PDF, DOCX, TXT or MD document (via the upload button in the "
            "chat or the Upload docs section) for detailed, document-grounded answers."
        )

    return (
        "You are Dynamic Customer Agent — a helpful, precise, multilingual support assistant."
        + domain_directive
        + " "
        + language_directive
        + " Carefully search the provided document excerpts and any attached file before responding. "
        "Give a clear, direct answer first, then a brief explanation with the relevant details. "
        "Use short paragraphs, bullet points, or numbered steps to make the answer easy to scan. "
        "When you use document excerpts, cite them inline as [Chunk N]. "
        "If a user attaches a file that is not related to the loaded documents, still help them "
        "fully — analyze it, explain what you see, and answer their question. "
        "Never begin a response with an apology like 'Sorry' — always help pleasantly. "
        "If information is genuinely missing, ask a short clarifying question or answer from "
        "general knowledge, but do not refuse."
        + no_docs_directive
        + context_block
    )


# ---------------------------------------------------------------------------
# Message building
# ---------------------------------------------------------------------------
def build_messages(history, attachment, system_prompt):
    out = [{"role": "system", "content": system_prompt}]
    last = len(history) - 1
    for i, m in enumerate(history):
        is_last_user = i == last and m.get("role") == "user" and bool(attachment)
        if not is_last_user:
            out.append({"role": m.get("role"), "content": m.get("content", "")})
            continue

        content = m.get("content", "")
        if attachment.get("kind") == "image":
            out.append(
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"{content}\n\n(Attached file: {attachment.get('name')})",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": attachment.get("dataUrl")},
                        },
                    ],
                }
            )
        else:
            trimmed = (attachment.get("text") or "")[:MAX_ATTACHMENT_CHARS]
            out.append(
                {
                    "role": "user",
                    "content": (
                        f"{content}\n\n[Attached file: {attachment.get('name')}]\n"
                        f"---\n{trimmed}\n---"
                    ),
                }
            )
    return out


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return jsonify({"ok": True, "hasKey": bool(os.environ.get("GROQ_API_KEY"))})


@app.post("/api/chat")
def chat():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return jsonify({"error": "GROQ_API_KEY is not configured on the server."}), 500

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({"error": "Invalid JSON body."}), 400

    history = body.get("messages")
    if not isinstance(history, list) or len(history) == 0:
        return jsonify({"error": "messages required."}), 400

    context_chunks = body.get("contextChunks") or []
    if not isinstance(context_chunks, list):
        context_chunks = []
    attachment = body.get("attachment") if isinstance(body.get("attachment"), dict) else None
    output_language = body.get("outputLanguage") or None
    domain = body.get("domain")
    domain = domain.strip()[:MAX_DOMAIN_CHARS] if isinstance(domain, str) else ""

    system_prompt = build_system_prompt(
        context_chunks, output_language, domain, bool(attachment)
    )
    messages = build_messages(history, attachment, system_prompt)
    model = VISION_MODEL if attachment else TEXT_MODEL

    try:
        upstream = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": messages,
                "stream": True,
                "temperature": 0.6,
            },
            stream=True,
            timeout=120,
        )
    except requests.RequestException as exc:
        return jsonify({"error": f"Could not reach Groq: {exc}"}), 502

    if upstream.status_code >= 400:
        detail = upstream.text[:400] if upstream.text else ""
        upstream.close()
        return (
            jsonify(
                {"error": f"Groq error {upstream.status_code} (model: {model}): {detail}"}
            ),
            upstream.status_code,
        )

    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=None):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    return Response(
        generate(),
        headers={
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# Convenience: some hosts route the app at the root.
@app.post("/chat")
def chat_alias():
    return chat()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, threaded=True, debug=False)
