# Memory Index - India Biodiversity Explorer

## Reference Files
- [full_project_analysis](analysis_full_project.md) - Complete analysis (frontend, backend, AI, data flow)
- [api_reliability_analysis](analysis_api_reliability.md) - API reliability fixes (fallback responses, timeout handling)

## User Preferences & Project Context
- Last updated: 2026-04-17
- Current branch: main
- Working directory: C:\India Biodivesity - Copy
- Status: API RELIABILITY IMPROVEMENTS COMPLETED (2026-04-17)

## API Reliability Fixes Applied: 2026-04-17

### 1. server.js - Trust Proxy Added
- Added `app.set('trust proxy', 1)` for correct IP detection behind reverse proxies
- Fixes rate limiter IP detection issues

### 2. adminController.getDashboardStats - Partial Failure Tolerance
- Added `safeQuery()` wrapper for each Promise.all query
- If any query fails, returns fallback values instead of crashing
- Added `partialFailure: false` to response when all succeed
- Dashboard now returns partial data even if some queries fail

### 3. mapController.getMapSpecies - Independent Fetch with Fallback
- Animals and plants now fetched independently in try/catch blocks
- If either fails, the other still returns data
- Added `partialFailure` and `warnings` array in response
- Map now shows whatever data is available, even if one source fails

### 4. speciesController.getRecommendations - Fallback Empty Array
- Added try/catch around recommendationService call
- If service fails, returns empty recommendations with fallback metadata
- Frontend shows "No recommendations" gracefully instead of error

### 5. useSpeciesData.loadMore - Error State Now Set
- Fixed loadMore catch block to call setError
- User now sees error message when pagination load more fails

### 6. useSpeciesDetail - Retry Logic Added
- Added retry logic for 5xx errors (up to 3 retries)
- Exponential backoff: 1s, 2s, 3s between retries
- AbortController for cleanup on unmount

### 7. imageRecognitionService - Retry Interceptor Added
- Added axios retry interceptor with exponential backoff
- Retries up to 3 times for failed requests
- Excludes 413 (Payload Too Large) and 415 (Unsupported Media Type) from retry

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript, TailwindCSS, React Router v6
- **Backend**: Node.js + Express, MongoDB + Mongoose
- **AI Service**: Python FastAPI + TensorFlow MobileNetV2
- **Auth**: JWT with Admin model (separate from User model)

## Key Architecture

### Admin System (Implemented)
- Admin JWT auth at `/api/admin/auth/login`
- `adminAuth` middleware validates JWT + checks admin isActive
- Protected routes: `/api/admin/*` all require `adminAuth`
- Default admin: `admin` / `Admin@123` (seed via POST `/api/admin/auth/seed`)

### CRUD Endpoints (All Implemented & Fixed)
- Species: GET/POST/PUT/DELETE `/api/admin/species`
- Plants: GET/POST/PUT/DELETE `/api/admin/plants`
- Ecosystems: GET/POST/PUT/DELETE `/api/admin/ecosystems`
- Zones: GET/POST/PUT/DELETE `/api/admin/zones`
- Quiz: GET/POST/PUT/DELETE `/api/admin/quiz`
- Map coordinates: GET `/api/admin/map/species`, PATCH `/api/admin/map/species/:id/coordinates`

### Frontend Admin Components
- `AdminDashboard.tsx` - Main dashboard page
- `AdminSidebar.tsx` - Navigation sidebar
- `AdminAuthGuard.tsx` - Route protection wrapper
- `AdminDataTable.tsx` - Reusable CRUD table
- `AdminFormModal.tsx` - Reusable form modal
- `AdminSpeciesManager.tsx` - Species CRUD UI
- `AdminPlantManager.tsx` - Plant CRUD UI
- `AdminEcosystemManager.tsx` - Ecosystem CRUD UI
- `AdminZoneManager.tsx` - Zone CRUD UI
- `AdminQuizManager.tsx` - Quiz CRUD UI
- `AdminMapDataManager.tsx` - Map coordinate editor
- `AdminDashboardOverview.tsx` - Stats overview
- `AdminAnalyticsPanel.tsx` - Analytics charts

### useAdmin Hook
- `login()` - POST `/api/admin/auth/login`
- `logout()` - Clears localStorage
- `adminFetch()` - Authenticated fetch wrapper, auto-logout on 401
- `getAuthHeaders()` - Returns Authorization header
