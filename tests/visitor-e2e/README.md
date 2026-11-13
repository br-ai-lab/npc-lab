# Visitor Management — Playwright API + E2E tests

Automated tests for the company visitor management system (`backend/` + `frontend/`).

- **API tests** (`specs/api/`) exercise the real Spring Boot API on `http://localhost:8080/api`.
- **E2E tests** (`specs/e2e/`) drive the real React app on `http://127.0.0.1:5173` through Chromium,
  which in turn calls the real backend through the Vite `/api` proxy. There is no mocking of the
  backend except in the explicit "backend unavailable" test, which aborts `/api/**` requests.

## Requirements

- Node.js 18+ (repo CI uses 22)
- Backend and frontend running (see [`docs/visitor-system.md`](../../docs/visitor-system.md)):
  - backend: `cd backend && mvn spring-boot:run` → `http://localhost:8080`
  - frontend: `cd frontend && npm install && npm run dev` → `http://127.0.0.1:5173`
- Playwright browsers installed (`npx playwright install --with-deps chromium`).

The GitHub workflow for this repository starts both services before the tests run; in that
environment you only need `npm install` here.

## Install and run

```bash
cd tests/visitor-e2e
timeout 900 npm install
timeout 300 npx playwright test
```

Useful subsets:

```bash
npx playwright test specs/api     # API contract tests only
npx playwright test specs/e2e     # browser end-to-end tests only
npx playwright test --headed      # watch the browser
npx playwright show-report        # open the HTML report
```

Environment overrides:

| Variable | Default | Purpose |
|---|---|---|
| `API_BASE_URL` | `http://localhost:8080/api` | Backend base URL used by API tests |
| `E2E_BASE_URL` | `http://127.0.0.1:5173` | Frontend base URL used by browser tests |

## Test data

Tests always create their own records with unique names/phones (`E2E访客…` prefix), so they work
against a non-empty database and can be re-run repeatedly. Some tests use the keyword filter to
isolate their own record; none assert on global totals.

## Coverage

| File | Covers |
|---|---|
| `specs/api/visitor-api.spec.js` | health; create 201/PENDING; 400 + `fieldErrors` for missing fields and invalid phone; confirm → badge `V<yyyyMMdd>-NNN`; checkout with/without badge; reject; force-leave with required reason; 409 for repeated checkout / wrong-state transitions; 404 for unknown ids; list filters (status/date/keyword) and invalid filter values; `/api/stats/today` field completeness |
| `specs/e2e/dashboard.spec.js` | dashboard stats + panels; confirm, reject, checkout and force-leave dialogs against the real backend |
| `specs/e2e/register.spec.js` | registration submit; client-side required-field and phone validation |
| `specs/e2e/visitors.spec.js` | keyword/status filters, detail dialog, checkout from the records table, empty state |
| `specs/e2e/policy-and-errors.spec.js` | policy page seven chapters, 404 route, backend-unavailable error notice, main navigation |

## Notes

- `workers: 1` / `fullyParallel: false` keep browser tests deterministic against the shared SQLite
  database.
- Reports (`playwright-report/`, `test-results/`) and `node_modules/` are git-ignored.
