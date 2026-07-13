# Academic Service — OFPPT Intranet Platform

Microservice responsible for **branches, groups, modules, rooms, teachers, students, and weekly timetable management** for the OFPPT vocational training platform.

- **Runtime:** Node.js 20, Express
- **ORM:** Prisma + MySQL
- **Auth:** Delegates token verification to the Auth Service (no shared JWT secret)
- **Port:** `3002`

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Running with Docker Compose](#running-with-docker-compose)
4. [Running Locally (without Docker)](#running-locally-without-docker)
5. [Database Migrations & Seed](#database-migrations--seed)
6. [Slot Numbering Convention](#slot-numbering-convention)
7. [API Reference](#api-reference)
   - [Branches](#branches)
   - [Groups](#groups)
   - [Modules](#modules)
   - [Rooms](#rooms)
   - [Teachers](#teachers)
   - [Students](#students)
   - [Sessions & Schedule](#sessions--schedule)

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose (for containerised setup)
- A running **auth-service** instance (provides `/api/auth/verify` and `/api/users/:id`)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | MySQL connection string |
| `AUTH_SERVICE_URL` | ✅ | — | Base URL of the auth service |
| `PORT` | ❌ | `3002` | HTTP port |
| `NODE_ENV` | ❌ | `development` | `development` or `production` |
| `LOG_LEVEL` | ❌ | `info` | Pino log level |
| `FRONTEND_URL` | ❌ | `*` | Allowed CORS origin |
| `CANCELLED_INSTANCE_RETENTION_DAYS` | ❌ | `30` | Days before old cancelled instances are purged |

The service **crashes on startup** if `DATABASE_URL` or `AUTH_SERVICE_URL` are missing.

---

## Running with Docker Compose

The `docker-compose.yml` in this folder starts **all four containers**:

| Container | Exposes | Description |
|---|---|---|
| `auth-db` | `3307` | MySQL for auth service |
| `auth-service` | `3001` | Auth microservice |
| `academic-db` | `3308` | MySQL for academic service |
| `academic-service` | `3002` | This service |

```bash
# 1. Create .env files (see above)
cp .env.example .env

# 2. Build and start all services
docker compose up --build

# 3. Seed the academic DB (in a second terminal)
docker compose exec academic-service node prisma/seed.js
```

> **Note:** Update the `auth-service.build.context` path in `docker-compose.yml` to point to your actual auth-service folder.

---

## Running Locally (without Docker)

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:migrate

# Seed sample data
npm run db:seed

# Start in development mode (nodemon)
npm run dev

# Start in production mode
npm start
```

---

## Database Migrations & Seed

```bash
npm run db:migrate       # create & apply a new migration (dev)
npm run db:migrate:prod  # apply pending migrations (production/CI)
npm run db:seed          # insert sample data
npm run db:studio        # open Prisma Studio UI
npm run db:reset         # drop + recreate DB (dev only)
```

---

## Slot Numbering Convention

Sessions use **slot indices** rather than raw times so the frontend controls the display mapping. The reference mapping used in this service is:

| Slot | Time |
|------|------|
| 0 | 08:30 – 10:30 |
| 1 | 10:30 – 12:30 |
| 2 | 14:00 – 16:00 |
| 3 | 16:00 – 18:00 |

`slot_count` is how many consecutive slots the session spans.  
`day_of_week`: `0` = Monday … `6` = Sunday.

---

## API Reference

All authenticated endpoints require:

```
Authorization: Bearer <token>
```

Tokens are obtained from the Auth Service (`POST /api/auth/login`).

Paginated responses always include:

```json
{
  "data": [...],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "total_pages": 5
  }
}
```

---

### Branches

#### GET /api/branches
List all branches (paginated).

```bash
curl -X GET "http://localhost:3002/api/branches?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

#### POST /api/branches
Create a branch. Requires `create:group` permission.

```bash
curl -X POST http://localhost:3002/api/branches \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Développement Digital", "max_students": 120}'
```

#### GET /api/branches/:id

```bash
curl http://localhost:3002/api/branches/1 \
  -H "Authorization: Bearer TOKEN"
```

#### PUT /api/branches/:id
Requires `update:group` permission.

```bash
curl -X PUT http://localhost:3002/api/branches/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"max_students": 150}'
```

#### DELETE /api/branches/:id
Requires `delete:group` permission.

```bash
curl -X DELETE http://localhost:3002/api/branches/1 \
  -H "Authorization: Bearer TOKEN"
```

---

### Groups

#### GET /api/groups
Paginated, filterable by `branch_id`.

```bash
curl "http://localhost:3002/api/groups?branch_id=1&page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

#### POST /api/groups

```bash
curl -X POST http://localhost:3002/api/groups \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "DD-101", "branch_id": 1, "max_students": 25}'
```

#### GET /api/groups/:id

```bash
curl http://localhost:3002/api/groups/1 \
  -H "Authorization: Bearer TOKEN"
```

#### PUT /api/groups/:id

```bash
curl -X PUT http://localhost:3002/api/groups/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"max_students": 30}'
```

#### DELETE /api/groups/:id

```bash
curl -X DELETE http://localhost:3002/api/groups/1 \
  -H "Authorization: Bearer TOKEN"
```

#### GET /api/groups/:id/students
List all students enrolled in a group.

```bash
curl "http://localhost:3002/api/groups/1/students?page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

---

### Modules

#### GET /api/modules

```bash
curl "http://localhost:3002/api/modules?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

#### POST /api/modules
`type` must be `theoretical` or `practical`.

```bash
curl -X POST http://localhost:3002/api/modules \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Développement Web Frontend",
    "type": "theoretical",
    "credits": 4,
    "total_hours": 60
  }'
```

#### GET /api/modules/:id

```bash
curl http://localhost:3002/api/modules/1 \
  -H "Authorization: Bearer TOKEN"
```

#### PUT /api/modules/:id

```bash
curl -X PUT http://localhost:3002/api/modules/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credits": 5}'
```

#### DELETE /api/modules/:id

```bash
curl -X DELETE http://localhost:3002/api/modules/1 \
  -H "Authorization: Bearer TOKEN"
```

#### GET /api/modules/:id/teachers
List all teachers assigned to this module.

```bash
curl http://localhost:3002/api/modules/1/teachers \
  -H "Authorization: Bearer TOKEN"
```

#### POST /api/modules/:id/teachers
Assign a teacher to the module.

```bash
curl -X POST http://localhost:3002/api/modules/1/teachers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"teacher_id": 2}'
```

#### DELETE /api/modules/:id/teachers/:teacherId
Unassign a teacher.

```bash
curl -X DELETE http://localhost:3002/api/modules/1/teachers/2 \
  -H "Authorization: Bearer TOKEN"
```

---

### Rooms

#### GET /api/rooms

```bash
curl "http://localhost:3002/api/rooms?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

#### POST /api/rooms

```bash
curl -X POST http://localhost:3002/api/rooms \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Salle A101", "capacity": 30}'
```

#### GET /api/rooms/:id

```bash
curl http://localhost:3002/api/rooms/1 \
  -H "Authorization: Bearer TOKEN"
```

#### PUT /api/rooms/:id

```bash
curl -X PUT http://localhost:3002/api/rooms/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"capacity": 35}'
```

#### DELETE /api/rooms/:id

```bash
curl -X DELETE http://localhost:3002/api/rooms/1 \
  -H "Authorization: Bearer TOKEN"
```

---

### Teachers

Teacher profiles are linked to users in the Auth Service via `user_id`. The user must exist in the Auth Service before a teacher profile can be created.

#### GET /api/teachers

```bash
curl "http://localhost:3002/api/teachers?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

#### POST /api/teachers
Validates `user_id` against the Auth Service.

```bash
curl -X POST http://localhost:3002/api/teachers \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 2,
    "specialization": "Développement Web",
    "hire_date": "2020-09-01"
  }'
```

#### GET /api/teachers/:id

```bash
curl http://localhost:3002/api/teachers/2 \
  -H "Authorization: Bearer TOKEN"
```

#### PUT /api/teachers/:id

```bash
curl -X PUT http://localhost:3002/api/teachers/2 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"specialization": "Fullstack JavaScript"}'
```

#### DELETE /api/teachers/:id

```bash
curl -X DELETE http://localhost:3002/api/teachers/2 \
  -H "Authorization: Bearer TOKEN"
```

#### GET /api/teachers/:id/schedule
Returns the teacher's full weekly timetable (all active sessions across all groups).

```bash
curl http://localhost:3002/api/teachers/2/schedule \
  -H "Authorization: Bearer TOKEN"
```

---

### Students

Student profiles are linked to Auth Service users via `user_id`.

#### GET /api/students
Filterable by `group_id` (pass `group_id=null` to list unassigned students).

```bash
curl "http://localhost:3002/api/students?group_id=1&page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

#### POST /api/students
Validates `user_id` against the Auth Service.

```bash
curl -X POST http://localhost:3002/api/students \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 5,
    "group_id": 1,
    "enrollment_date": "2024-09-01"
  }'
```

#### GET /api/students/:id

```bash
curl http://localhost:3002/api/students/5 \
  -H "Authorization: Bearer TOKEN"
```

#### PUT /api/students/:id
Can reassign the student to a different group.

```bash
curl -X PUT http://localhost:3002/api/students/5 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"group_id": 2}'
```

#### DELETE /api/students/:id

```bash
curl -X DELETE http://localhost:3002/api/students/5 \
  -H "Authorization: Bearer TOKEN"
```

---

### Sessions & Schedule

Sessions are **recurring weekly slots**. Session instances are the **dated occurrences** of those slots.

#### POST /api/sessions
Create a recurring session.

```bash
curl -X POST http://localhost:3002/api/sessions \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module_teacher_group_id": 1,
    "day_of_week": 0,
    "start_slot": 0,
    "slot_count": 2,
    "is_online": false,
    "room_id": 1
  }'
```

#### GET /api/sessions
Filterable by `module_teacher_group_id`, `day_of_week`, `room_id`.

```bash
curl "http://localhost:3002/api/sessions?day_of_week=0&page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"
```

#### GET /api/sessions/:id

```bash
curl http://localhost:3002/api/sessions/1 \
  -H "Authorization: Bearer TOKEN"
```

#### PUT /api/sessions/:id

```bash
curl -X PUT http://localhost:3002/api/sessions/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"start_slot": 1, "room_id": 2}'
```

#### DELETE /api/sessions/:id

```bash
curl -X DELETE http://localhost:3002/api/sessions/1 \
  -H "Authorization: Bearer TOKEN"
```

#### POST /api/sessions/:id/instances
Generate dated instances for a session within a date range.

```bash
curl -X POST http://localhost:3002/api/sessions/1/instances \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-01-01",
    "end_date":   "2025-01-31"
  }'
```

Response:
```json
{ "created": 4, "skipped": 0, "total_dates": 4 }
```

#### PATCH /api/sessions/instances/:id
Cancel an instance or override its room.

```bash
# Cancel an instance
curl -X PATCH http://localhost:3002/api/sessions/instances/12 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_cancelled": true}'

# Move instance to a different room
curl -X PATCH http://localhost:3002/api/sessions/instances/12 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"override_room_id": 3}'
```

#### GET /api/schedule/week
Full week timetable. Requires either `group_id` or `teacher_id`.

```bash
# Timetable for group 1, week of 2025-01-13
curl "http://localhost:3002/api/schedule/week?date=2025-01-13&group_id=1" \
  -H "Authorization: Bearer TOKEN"

# Timetable for teacher 2, same week
curl "http://localhost:3002/api/schedule/week?date=2025-01-13&teacher_id=2" \
  -H "Authorization: Bearer TOKEN"
```

Response structure:

```json
{
  "date": "2025-01-13",
  "group_id": 1,
  "week": {
    "monday": {
      "date": "2025-01-13",
      "slots": [
        {
          "session_id": 1,
          "start_slot": 0,
          "slot_count": 2,
          "is_online": false,
          "room": { "id": 1, "name": "Salle A101", "capacity": 30 },
          "module": { "id": 1, "name": "Développement Web Frontend", "type": "theoretical" },
          "teacher": { "user_id": 2, "specialization": "Développement Web" },
          "group": { "id": 1, "name": "DD-101" },
          "instance": {
            "id": 7,
            "date": "2025-01-13",
            "is_cancelled": false,
            "override_room": null
          }
        }
      ]
    },
    "tuesday":   { "date": "2025-01-14", "slots": [] },
    "wednesday": { "date": "2025-01-15", "slots": [] },
    "thursday":  { "date": "2025-01-16", "slots": [] },
    "friday":    { "date": "2025-01-17", "slots": [] },
    "saturday":  { "date": "2025-01-18", "slots": [] },
    "sunday":    { "date": "2025-01-19", "slots": [] }
  }
}
```

---

## Error Format

All errors follow:

```json
{ "error": "Human-readable message" }
```

| Code | Meaning |
|------|---------|
| 400 | Validation error / bad input |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Unique constraint violation |
| 503 | Auth service unreachable |

---

## Background Jobs

The service runs a **cleanup job** every 24 hours that deletes `is_cancelled = true` session instances older than `CANCELLED_INSTANCE_RETENTION_DAYS` (default: 30 days). This keeps the `session_instances` table lean without losing recent cancellation history.

---

## Health Check

```bash
curl http://localhost:3002/health
# {"status":"ok","service":"academic-service","timestamp":"..."}
```
