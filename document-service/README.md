# document-service

Node.js · Express · Prisma · MySQL microservice for OFPPT document management.

Handles course documents uploaded by teachers, exercise assignments to groups, and student exercise submissions — all with file upload/download and cross-service validation against the **auth-service** and **academic-service**.

---

## Table of contents

- [Stack](#stack)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [File storage](#file-storage)
- [Authentication & permissions](#authentication--permissions)
- [API reference](#api-reference)
  - [Documents](#documents)
  - [Module documents](#module-documents)
  - [Exercise assignments](#exercise-assignments)
  - [Exercise submissions](#exercise-submissions)
- [Row-level access rules](#row-level-access-rules)
- [Error codes](#error-codes)
- [Running with Docker](#running-with-docker)
- [Full stack (all three services)](#full-stack-all-three-services)

---

## Stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Runtime    | Node.js 20, ESM modules       |
| Framework  | Express 4                     |
| ORM        | Prisma 5 + MySQL 8            |
| Validation | Zod                           |
| Uploads    | Multer                        |
| Logging    | Pino + pino-pretty (dev)      |
| Security   | Helmet, CORS, express-rate-limit |

---

## Quick start

```bash
cp .env.example .env          # fill in your values
npm install
npm run db:migrate            # creates tables
npm run db:seed               # optional sample data
npm run dev                   # nodemon watch mode
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | Prisma MySQL connection string |
| `AUTH_SERVICE_URL` | ✅ | — | Base URL of auth-service (e.g. `http://localhost:3001`) |
| `ACADEMIC_SERVICE_URL` | ✅ | — | Base URL of academic-service (e.g. `http://localhost:3002`) |
| `PORT` | | `3003` | HTTP port |
| `NODE_ENV` | | `development` | `development` enables pino-pretty |
| `FRONTEND_URL` | | `http://localhost:5173` | Allowed CORS origin |
| `UPLOAD_DIR` | | `uploads` | Root directory for stored files |
| `MAX_DOCUMENT_SIZE_MB` | | `20` | Max size for teacher-uploaded documents |
| `MAX_SUBMISSION_SIZE_MB` | | `10` | Max size for student submissions |
| `LOG_LEVEL` | | `info` | Pino log level |

The service **crashes on startup** if `DATABASE_URL`, `AUTH_SERVICE_URL`, or `ACADEMIC_SERVICE_URL` are missing.

---

## Database setup

```bash
# Development — creates migration files + applies them
npm run db:migrate

# Production — applies existing migrations only (no file generation)
npm run db:migrate:prod

# Seed sample data (3 documents, 1 assignment, 1 submission)
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

---

## File storage

```
uploads/
├── documents/        ← teacher-uploaded course materials (PDF, PPTX, DOCX)
└── submissions/      ← student exercise submissions (PDF, ZIP)
```

- `file_path` in the database is relative to the `uploads/` root, e.g. `documents/1701234567-algo.pdf`
- Files are served via `GET /api/documents/:id/download` and `GET /api/submissions/:id/download`
- Deleting a document or submission **also deletes the file from disk**
- The `uploads/` directory is excluded from git; in Docker it is a named volume so files persist across container restarts

**Multer limits:**

| Upload type | Allowed MIME types | Max size |
|---|---|---|
| Documents | PDF, PPT/PPTX, DOC/DOCX | 20 MB |
| Submissions | PDF, ZIP | 10 MB |

---

## Authentication & permissions

Every protected endpoint requires:

```
Authorization: Bearer <jwt>
```

The service delegates all token verification to the auth-service (`POST /api/auth/verify`). No JWT secret is shared.

| Permission | Roles |
|---|---|
| `read:document` | all roles |
| `create:document` | formateur, direction |
| `update:document` | formateur (own only), direction |
| `delete:document` | formateur (own only), direction |
| `assign:document` | formateur, direction |
| `submit:document` | stagiaire only |

---

## API reference

> Replace `$TOKEN` with a valid JWT from the auth-service.
> Replace `:id` with an actual integer ID.

---

### Documents

#### List documents

```bash
# All documents (paginated)
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/documents?page=1&limit=20'

# Filter by type
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/documents?type=course'

# Filter by module
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/documents?module_id=1'
```

Response:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Introduction à l'Algorithmique",
      "type": "course",
      "uploaded_by": 2,
      "file_path": "documents/1701234567-algo.pdf",
      "upload_date": "2024-11-29T10:00:00.000Z",
      "module_documents": [{ "module_id": 1 }]
    }
  ],
  "pagination": { "total": 3, "page": 1, "limit": 20, "total_pages": 1 }
}
```

---

#### Upload a document

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=Introduction à l'Algorithmique" \
  -F "type=course" \
  -F "file=@/path/to/algo-course.pdf" \
  http://localhost:3003/api/documents
```

Response `201`:
```json
{
  "id": 1,
  "title": "Introduction à l'Algorithmique",
  "type": "course",
  "uploaded_by": 2,
  "file_path": "documents/1701234567-algo.pdf",
  "upload_date": "2024-11-29T10:00:00.000Z"
}
```

---

#### Get a document

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/documents/1
```

---

#### Update document metadata

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Algorithmique — Cours révisé", "type": "resource"}' \
  http://localhost:3003/api/documents/1
```

> Only updates `title` and/or `type`. To replace the file, delete and re-upload.

---

#### Delete a document

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/documents/1
```

Response `204 No Content`. The physical file is deleted from disk.

---

#### Download a document

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/documents/1/download \
  --output algo-course.pdf
```

---

### Module documents

#### List documents linked to a module

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/modules/1/documents
```

Response:
```json
{
  "data": [
    { "id": 1, "title": "Introduction à l'Algorithmique", "type": "course", ... }
  ]
}
```

---

#### Link a document to a module

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_id": 1}' \
  http://localhost:3003/api/modules/1/documents
```

Response `201`:
```json
{ "module_id": 1, "document_id": 1 }
```

---

#### Unlink a document from a module

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/modules/1/documents/1
```

Response `204 No Content`. The document record itself is **not** deleted, only the link.

---

### Exercise assignments

#### List assignments

```bash
# All assignments
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/assignments?page=1&limit=20'

# Filter by group
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/assignments?group_id=1'

# Filter by document
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/assignments?document_id=2'
```

---

#### Create an assignment

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": 2,
    "group_id": 1,
    "due_date": "2025-06-30T23:59:00.000Z"
  }' \
  http://localhost:3003/api/assignments
```

Response `201`:
```json
{
  "id": 1,
  "document_id": 2,
  "group_id": 1,
  "assigned_by": 2,
  "due_date": "2025-06-30T23:59:00.000Z",
  "created_at": "2024-11-29T10:00:00.000Z",
  "document": { "id": 2, "title": "TP01 — OOP Exercises", "type": "exercise" }
}
```

---

#### Get an assignment

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/assignments/1
```

---

#### Update an assignment (due date only)

```bash
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"due_date": "2025-07-15T23:59:00.000Z"}' \
  http://localhost:3003/api/assignments/1

# Remove due date
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"due_date": null}' \
  http://localhost:3003/api/assignments/1
```

---

#### Delete an assignment

```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/assignments/1
```

Response `204 No Content`.

---

#### List submissions for an assignment

```bash
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/assignments/1/submissions?page=1&limit=20'
```

---

### Exercise submissions

#### List submissions

```bash
# All visible submissions (row-level rules apply)
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/submissions?page=1&limit=20'

# Filter by assignment
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/submissions?assignment_id=1'

# Filter by student (direction/formateur only)
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:3003/api/submissions?submitted_by=9'
```

---

#### Submit an exercise

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "exercise_assignment_id=1" \
  -F "file=@/path/to/my-tp01.pdf" \
  http://localhost:3003/api/submissions
```

Response `201`:
```json
{
  "id": 1,
  "exercise_assignment_id": 1,
  "submitted_by": 9,
  "file_path": "submissions/1701234567-my-tp01.pdf",
  "submission_date": "2024-11-29T12:00:00.000Z",
  "status": "pending",
  "assignment": { "id": 1, "document_id": 2, "group_id": 1, "due_date": "..." }
}
```

> The student must belong to the assignment's group — validated against the academic-service.

---

#### Get a submission

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/submissions/1
```

---

#### Update submission status

```bash
# Mark as reviewed
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "reviewed"}' \
  http://localhost:3003/api/submissions/1/status

# Mark as graded
curl -X PATCH \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "graded"}' \
  http://localhost:3003/api/submissions/1/status
```

> Requires `assign:document` permission (formateur/direction). Only the formateur who created the assignment (or direction) can update status.

---

#### Download a submission

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3003/api/submissions/1/download \
  --output submission-1.pdf
```

---

## Row-level access rules

| Rule | Applied in |
|---|---|
| Formateur can only `PUT`/`DELETE` their own documents | `document.service.js` |
| Formateur can only update/delete their own assignments | `assignment.service.js` |
| Stagiaire can only submit to assignments for their group | `submission.service.js` + academic-service |
| Stagiaire can only see their own submissions | `submission.service.js` |
| Formateur can only see submissions for their own assignments | `submission.service.js` |
| Direction has no row-level restrictions | all services |

---

## Error codes

| HTTP | Cause |
|---|---|
| `400` | Validation error or referenced record missing in another service |
| `401` | Missing or invalid token |
| `403` | Permission denied or row-level access violation |
| `404` | Record not found |
| `409` | Duplicate entry (Prisma P2002) |
| `413` | File too large |
| `415` | Unsupported file type |
| `422` | Zod validation failed (field-level errors returned) |
| `503` | auth-service or academic-service unreachable |

---

## Running with Docker

```bash
# Copy and edit env
cp .env.example .env

# Build and start (document-service + its own MySQL only)
docker compose up --build

# With seeded data
docker compose exec document-service node prisma/seed.js
```

> The standalone compose points `AUTH_SERVICE_URL` and `ACADEMIC_SERVICE_URL` to `host.docker.internal` — the two other services should be running locally on ports 3001 and 3002.

---

## Full stack (all three services)

Run from the **document-service** directory (it references `../auth-service` and `../academic-service`):

```bash
docker compose -f docker-compose.full.yml up --build
```

Services:

| Service | Port |
|---|---|
| auth-service | 3001 |
| academic-service | 3002 |
| document-service | 3003 |
| auth-db (MySQL) | 3307 |
| academic-db (MySQL) | 3308 |
| document-db (MySQL) | 3309 |

Seed all three services in order:

```bash
docker compose -f docker-compose.full.yml exec auth-service     node prisma/seed.js
docker compose -f docker-compose.full.yml exec academic-service node prisma/seed.js
docker compose -f docker-compose.full.yml exec document-service node prisma/seed.js
```
