# BP Local Sync Agent

Small local bridge for production sync:

```text
deployed BP web app -> http://127.0.0.1:8765 -> local UWW Arena -> deployed BP backend
```

Run directly on the trainer's computer:

```bash
cd local-sync-agent
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn agent:app --host 127.0.0.1 --port 8765
```

Then keep UWW Arena exposed on `http://localhost:8080`, open the deployed BP app,
and click Synchronize.

Docker is possible, but then `localhost` inside the agent container points to the
agent container. Use `host.docker.internal` as the Arena host, or run the agent
directly with Python for the simplest local setup.
