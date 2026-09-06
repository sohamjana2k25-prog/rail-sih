# rail-sih

## Local development

Start the API from `backend-ai`:

```powershell
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Start the cockpit in a second terminal:

```powershell
cd frontend-cockpit
npm install
npm run dev
```

The Vite development server proxies `/api` requests to `http://127.0.0.1:8000`. If the API is unavailable, the cockpit displays its existing mock data and marks the connection as `OFFLINE / MOCK`.

