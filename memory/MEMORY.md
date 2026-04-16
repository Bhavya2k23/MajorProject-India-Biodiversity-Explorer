# Memory Index - India Biodiversity Explorer

## Reference Files
- [full_project_analysis](analysis_full_project.md) - Complete analysis (frontend, backend, AI, data flow)
- [admin_crud_analysis](analysis_admin_crud.md) - Admin CRUD operations analysis and enhancement plan
- [project_issues](analysis_issues.md) - ALL CRITICAL ISSUES FIXED (2026-04-16)

## User Preferences & Project Context
- Last updated: 2026-04-16-4
- Current branch: main
- Working directory: C:\India Biodivesity - Copy
- Status: ALL CRITICAL FIELD MISMATCHES FIXED (2026-04-16-4)

## Critical Fixes Applied: 2026-04-16-4

### 1. Zone Manager - Field Name Mismatch FIXED
- **Problem**: Zone model uses `zoneName`, frontend sent `name`
- **Fix**: Backend `createZone`/`updateZone` now map `name` → `zoneName`
- **Also fixed**: `states` → `statesCovered`, `keySpecies` stays, `threats` → `ecosystems`

### 2. Ecosystem Manager - Field Name Mismatch FIXED
- **Problem**: Ecosystem model uses `keySpecies`/`majorThreats`/`zone`, frontend sent different names
- **Fix**: Backend `createEcosystem`/`updateEcosystem` now map frontend fields correctly
- **Also fixed**: Species count query changed from `_id` to `name` for correct matching

### 3. Species Manager - Ecosystem/Zone Filter FIXED
- **Problem**: Dropdowns used `_id` as values but backend stores names as strings
- **Fix**: Dropdowns now use `name`/`zoneName` as values, not IDs

### 4. Species Create - Required Fields FIXED
- **Problem**: Species model requires `type`, `population`, `habitatLoss`, `pollutionLevel`, `climateRisk` but form doesn't have them
- **Fix**: Backend provides defaults (Mammal, 0, 50, 50, 50) if not provided
- **Also added**: Coordinates handling from `lat`/`lng`/`locationName` form fields

### 5. Species Update - Coordinates Handling FIXED
- **Problem**: Coordinates weren't being updated properly
- **Fix**: Backend now handles `lat`/`lng`/`locationName` → `coordinates` object

## Key Architecture (as of 2026-04-16)

### Tech Stack
- **Frontend**: React 18 + Vite + TypeScript, TailwindCSS, React Router v6
- **Backend**: Node.js + Express, MongoDB + Mongoose
- **AI Service**: Python FastAPI + TensorFlow MobileNetV2
- **Auth**: JWT with Admin model (separate from User model)

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
