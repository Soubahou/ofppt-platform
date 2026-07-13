# api-gateway

Single entry point for the OFPPT platform. All frontend requests arrive here on **port 3000**; the gateway routes them to the correct microservice, applies edge security, and normalises errors.

---

## What this service does

| Responsibility | Detail |
|---|---|
| **Routing** | Forwards every `/api/*` path to the right downstream service |
| **Edge security** | Helmet CSP headers, CORS locked to `FRONTEND_URL`, rate limiting |
| **Correlation IDs** | Attaches a UUID to every request and forwards it downstream so logs can be traced end-to-end |
| **Error normalisation** | If a service is down, returns a clean `503` instead of crashing |
| **Health aggregation** | `GET /health` probes all three services and reports their status |

The gateway **does not verify JWTs**. It has no JWT secret. It forwards the `Authorization` header as-is to each downstream service, which each call `POST /api/auth/verify` to validate tokens themselves.

---

## Routing table

| Prefix | Target service | Port |
|---|---|---|
| `/api/auth/*` | auth-service | 3001 |
| `/api/users/*` | auth-service | 3001 |
| `/api/branches/*` | academic-service | 3002 |
| `/api/groups/*` | academic-service | 3002 |
| `/api/modules/*` | academic-service | 3002 |
| `/api/rooms/*` | academic-service | 3002 |
| `/api/teachers/*` | academic-service | 3002 |
| `/api/students/*` | academic-service | 3002 |
| `/api/sessions/*` | academic-service | 3002 |
| `/api/schedule/*` | academic-service | 3002 |
| `/api/documents/*` | document-service | 3003 |
| `/api/assignments/*` | document-service | 3003 |
| `/api/submissions/*` | document-service | 3003 |

### Public routes (no auth header forwarding needed)

These routes work without a JWT and bypass any auth-header requirements at the service level:

```
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/verify
GET  /health
```

---

## Folder structure

```
api-gateway/
├── src/
│   ├── middleware/
│   │   ├── correlationId.js   ← attaches/creates x-correlation-id UUID
│   │   ├── requestLogger.js   ← structured logs: method, path, status, latency
│   │   └── stripHeaders.js    ← drops X-Internal-* headers from incoming requests
│   ├── proxy/
│   │   ├── auth.proxy.js      ← http-proxy-middleware for auth-service
│   │   ├── academic.proxy.js  ← http-proxy-middleware for academic-service
│   │   └── document.proxy.js  ← http-proxy-middleware for document-service
│   ├── routes/
│   │   └── health.routes.js   ← GET /health with downstream service checks
│   ├── utils/
│   │   └── logger.js          ← pino instance (pretty in dev, JSON in prod)
│   └── app.js                 ← Express setup and middleware/route wiring
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml          ← gateway only (other services run externally)
├── docker-compose.full.yml     ← entire stack: gateway + all services + all DBs
└── README.md
```

---

## Running locally (without Docker)

### Prerequisites

- Node.js 20+
- The three microservices running (see their own READMEs)

```bash
cp .env.example .env
# Edit .env — set AUTH/ACADEMIC/DOCUMENT _SERVICE_URL to where your services are
npm install
npm run dev
```

The gateway starts on `http://localhost:3000`.

---

## Running with Docker — gateway only

Use this when you want to run just the gateway in Docker while the three services run on your host.

```bash
cp .env.example .env
docker compose up --build
```

The `docker-compose.yml` defaults point service URLs to `host.docker.internal:{port}` so the gateway container can reach services on your host machine.

---

## Running with Docker — full stack

Use this to spin up the complete platform in one command.

```bash
# From the api-gateway directory — the compose file references sibling service dirs:
# ../auth-service, ../academic-service, ../document-service
docker compose -f docker-compose.full.yml up --build
```

Expected directory layout:

```
ofppt/
├── auth-service/
├── academic-service/
├── document-service/
└── api-gateway/          ← run docker compose from here
```

Services inside the compose network communicate directly by container name. **Only port 3000 is published to the host** — all other service ports are internal.

| Container | Internal port | Published to host |
|---|---|---|
| api-gateway | 3000 | ✅ `localhost:3000` |
| auth-service | 3001 | ❌ internal only |
| academic-service | 3002 | ❌ internal only |
| document-service | 3003 | ❌ internal only |
| auth-db | 3306 | `localhost:3307` (dev convenience) |
| academic-db | 3306 | `localhost:3308` (dev convenience) |
| document-db | 3306 | `localhost:3309` (dev convenience) |

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | Gateway listen port |
| `NODE_ENV` | no | `development` | `development` enables pino-pretty |
| `AUTH_SERVICE_URL` | **yes** | — | Base URL of auth-service |
| `ACADEMIC_SERVICE_URL` | **yes** | — | Base URL of academic-service |
| `DOCUMENT_SERVICE_URL` | **yes** | — | Base URL of document-service |
| `FRONTEND_URL` | **yes** | — | Allowed CORS origin |
| `LOG_LEVEL` | no | `info` | Pino log level |

The gateway crashes on startup if any required variable is missing.

---

## Health check

```
GET /health
```

Probes all three downstream services and aggregates the result:

```json
{
  "status": "ok",
  "gateway": "ok",
  "services": {
    "auth-service":     { "status": "ok",   "latency_ms": 12 },
    "academic-service": { "status": "ok",   "latency_ms": 8  },
    "document-service": { "status": "down", "error": "ECONNREFUSED" }
  }
}
```

`status` is `"ok"` when all services are healthy, `"degraded"` when some are down, and `"down"` when all are down (returns HTTP 503 in the last case).

---

## Rate limiting

Two tiers are applied at the gateway. Services also have their own limiters (defence in depth — the gateway catches bulk abuse, services catch anything that bypasses the gateway).

| Limiter | Applies to | Window | Max requests |
|---|---|---|---|
| Global | All routes | 15 min | 500 |
| Auth | `/api/auth/login`, `/api/auth/refresh` | 15 min | 20 |

---

## Correlation IDs

Every request gets a `x-correlation-id` UUID attached. If the client sends the header itself it is re-used (useful for browser-side tracing). The ID is:

- Stored on `req.correlationId`
- Echoed back in the response `x-correlation-id` header
- Injected into the proxy request header so downstream services can log it
- Included in every structured log line emitted by the gateway

To trace a request across all service logs, grep for the same UUID.

---

## Security notes

- `X-Internal-*` headers are stripped from all incoming requests before routing. This prevents clients from forging internal gateway markers.
- CORS is locked to `FRONTEND_URL`. Requests from other origins are rejected at the edge.
- The gateway never reads, validates, or decodes JWTs. Token logic is entirely inside auth-service.
