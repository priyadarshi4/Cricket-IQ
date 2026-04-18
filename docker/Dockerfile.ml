# ── Build stage ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder
WORKDIR /app
COPY api/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Runtime stage ──────────────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Security: non-root user
RUN useradd -m -u 1000 mluser

COPY --from=builder /root/.local /home/mluser/.local
COPY . .

# Make sure scripts in .local are usable
ENV PATH=/home/mluser/.local/bin:$PATH

RUN chown -R mluser:mluser /app
USER mluser

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
