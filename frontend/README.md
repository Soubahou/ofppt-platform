# OFPPT Connect — Portail Intranet Académique

React 18 + Vite frontend connecting to a single API gateway at `http://localhost:3000/api`.

## Quick Start

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # production build
```

## Environment

```env
VITE_API_URL=http://localhost:3000/api
```

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Server state | TanStack Query v5 |
| HTTP | Axios (interceptor-based, auto-refresh) |
| Drag & drop | dnd-kit |
| Styling | Tailwind CSS v3 |
| Toasts | react-hot-toast |

## Auth Flow

- `accessToken` (15 min) stored in React context only — never localStorage
- `refreshToken` via httpOnly cookie (or in-memory fallback)
- Axios response interceptor auto-retries 401s, queues concurrent requests during refresh
- `must_change_password` enforced client-side before any navigation

## Roles & Pages

| Page | direction | formateur | stagiaire |
|---|:---:|:---:|:---:|
| `/dashboard` | Admin view | Teacher view | Student view |
| `/schedule` | Group picker | Own schedule | Group schedule |
| `/schedule/builder` | Drag & drop EDT | — | — |
| `/absences` | All absences | Group validation | Submit justification |
| `/assignments` | Create/grade | Create/grade | View/submit |
| `/users`, `/branches`, `/modules` | Full CRUD | — | — |
| `/profile` | All | All | All |

## Demo Accounts (login page quick-fill)

| Role | Email | Password |
|---|---|---|
| Direction | nidal.sadiki@ofppt.ma | password123 |
| Formateur | karim.bennani@ofppt.ma | password123 |
| Stagiaire | yousra.amrani@ofppt-edu.ma | password123 |

## API Contract

All list endpoints: `{ data: [], total: N, totalPages: N }`
All errors: `{ message: string, errors?: object }`
