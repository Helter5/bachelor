# Backend Dockerfile
FROM python:3.12-slim

WORKDIR /app

# System dependencies (build toolchain for psycopg2, curl for healthcheck,
# DejaVu fonts for PDF export).
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first so they cache independently from app code.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source and prepare a writable uploads directory.
COPY . .
RUN mkdir -p /app/uploads

# Run as an unprivileged user. The uploads volume is mounted into /app/uploads
# so it needs to be writable by this user.
RUN groupadd --system app && useradd --system --gid app --no-create-home app \
    && mkdir -p /home/app/.config/matplotlib \
    && chown -R app:app /app /home/app
USER app

ENV MPLCONFIGDIR=/home/app/.config/matplotlib

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
