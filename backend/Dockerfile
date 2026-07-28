# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Long-lived SSE streams: no request timeout, threaded workers.
CMD exec gunicorn --bind :$PORT --workers 2 --threads 8 --timeout 0 app:app
