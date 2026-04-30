# BP Local Sync Agent

Small local bridge for production sync:

```text
deployed BP web app -> http://127.0.0.1:8765 -> local UWW Arena -> deployed BP backend
```

## Requirements

- Docker Desktop
- UWW Arena running at `http://localhost:8080`

## Setup

```bash
docker compose up -d
```

The agent pulls the image from `ghcr.io/helter5/bp-local-sync-agent:latest` and starts on port `8765`.

Keep it running while synchronizing. Open the web app, go to Settings, configure the Arena source, then click Synchronize.
