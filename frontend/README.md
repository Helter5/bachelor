# Frontend

React application for the wrestling federation management system.

**Stack:** React 19, TypeScript, Vite, Tailwind CSS, Redux, Recharts, i18next

---

## Directory structure

```
src/
  main.tsx             Entry point — wraps app in GoogleOAuthProvider, initializes i18n
  App.tsx              Root component — auth state, user data fetching, page routing

  components/
    LandingPage.tsx    Login and registration page
    Dashboard.tsx      Main app shell after login
    VerifyEmail.tsx    Email verification flow
    ResetPassword.tsx  Password reset flow
    ui/                Generic reusable components (buttons, modals, forms, tables)
    dashboard/         Feature modules rendered inside the dashboard
      layout/          Navigation, sidebar, header
      tournaments/     Event list and filtering
      tournamentDetail/ Event detail tabs (fights, draws, teams, athletes, stats)
      athletes/        Athlete database and profiles
      fighters/        Fighter stats, head-to-head comparisons
      calendar/        Calendar view of events and fights
      statistics/      Charts and tournament statistics (Recharts)
      sync/            Arena sync UI — remote and local sync flows
      settings/        Admin settings (arena sources, users)
      shared/          Filters, tables, and other shared dashboard components

  services/
    apiClient.ts       Central HTTP client — all API calls go through here
    authSession.ts     Session hint helpers for detecting existing sessions

  config/
    api.ts             API base URL and endpoint path constants

  domain/
    user.ts            AppUser type and mapping from API response

  types/               TypeScript types for athletes, teams, tournaments, weight categories
  hooks/               Custom React hooks (data fetching, filters, sync flow, dark mode)
  utils/               Formatting and shared helpers
  i18n/                i18next setup and translation files (SK, EN)
  assets/              Static images and icons
```

---

## Routing

There is no traditional React Router. Navigation is state-based — `App.tsx` holds a `currentPage` state and renders the appropriate component. URL locale prefix (`/sk/`, `/en/`) is enforced on load.

Pages: `landing` → `dashboard` (with sub-sections), `verify-email`, `reset-password`

---

## API calls

All HTTP calls go through `src/services/apiClient.ts`. It handles:
- Base URL from `VITE_API_URL` env variable
- Auth cookie (credentials included automatically)
- Error handling and response parsing

Endpoint paths are defined in `src/config/api.ts`. When adding a new API call, define the path there and call it via `apiClient`.

---

## State management

Global state (current user, auth status) lives in Redux store. Feature-level state is managed locally in components or via custom hooks in `src/hooks/`.

---

## Internationalization

Two languages: Slovak (`sk`) and English (`en`). Translation files are in `src/i18n/`. The active locale is derived from the URL prefix. Use the `useTranslation` hook from i18next to access strings.

---

## Environment variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_LOCAL_SYNC_AGENT_URL` | URL of the local sync agent (default `http://127.0.0.1:8765`) |
| `VITE_SYNC_MODE` | Sync mode override |

---

## Running locally

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`.

Other commands:

```bash
npm run build       # production build
npm run typecheck   # TypeScript check
npm run lint        # ESLint
```
