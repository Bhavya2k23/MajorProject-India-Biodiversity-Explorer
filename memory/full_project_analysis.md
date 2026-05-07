---
name: full_project_analysis
description: Complete analysis of India Biodiversity Explorer - frontend, backend, AI, data flow
type: reference
---

# India Biodiversity Explorer - Full Project Analysis

## 1. PROJECT STRUCTURE

```
India Biodivesity - Copy/
├── india-s-wild-explorer/          # Frontend (React/Vite/Bun)
│   ├── src/
│   │   ├── App.tsx                 # Main app with routing
│   │   ├── pages/                  # 21 page components
│   │   ├── components/             # UI components (shadcn/ui + custom)
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/              # API service layers
│   │   └── types/                  # TypeScript types
│   └── server/                    # Express backend (same repo)
│
├── backend/                        # Express backend (Node.js)
│   ├── server.js                  # Main entry point
│   ├── config/db.js               # MongoDB connection
│   ├── models/                    # Mongoose schemas (12 models)
│   ├── controllers/               # Route handlers (19 controllers)
│   ├── routes/                    # Express routers (14 route files)
│   ├── middleware/                # Auth, validation, upload, errorHandler
│   ├── services/                 # Business logic (12 services)
│   ├── scripts/                   # DB seeding scripts
│   ├── uploads/                   # Uploaded images
│   └── ai_service/                # Python FastAPI ML service
│
└── memory/                        # Claude memory files
```

## 2. BACKEND ARCHITECTURE

### Routes (`backend/routes/`)
| Route File | Base Path | Purpose |
|---|---|---|
| `adminRoutes.js` | `/api/admin` | Admin CRUD + auth |
| `authRoutes.js` | `/api/auth` | User authentication |
| `speciesRoutes.js` | `/api/animals` | Public animal API |
| `plantRoutes.js` | `/api/plants` | Public plant API |
| `ecosystemRoutes.js` | `/api/ecosystems` | Ecosystems data |
| `zoneRoutes.js` | `/api/zones` | Biogeographic zones |
| `quizRoutes.js` | `/api/quiz` | Quiz questions |
| `analyticsRoutes.js` | `/api/analytics` | Analytics data |
| `utilityRoutes.js` | `/api` | Search, chatbot, predict |
| `externalDataRoutes.js` | `/api/external` | GBIF/IUCN API integration |
| `imageRecognitionRoutes.js` | `/api/recognize` | AI species recognition |
| `recommendationRoutes.js` | `/api/recommendations` | Species recommendations |
| `leaderboardRoutes.js` | `/api/leaderboard` | Quiz leaderboard |
| `mapRoutes.js` | `/api/map` | Map species data |

### Models (`backend/models/`)
- `Species.js` - Animals with conservation status, coordinates, feature vectors
- `Plant.js` - Plants with conservation status, uses, coordinates
- `Admin.js` - Admin users (superadmin/admin/editor roles)
- `User.js` - Public users with favorites and quiz scores
- `Ecosystem.js`, `Zone.js`, `QuizQuestion.js`, `PredictionHistory.js`
- `LeaderboardAttempt.js`, `BestScore.js`, `CachedSpecies.js`

### Middleware (`backend/middleware/`)
- `auth.js` - User JWT (`protect`, `adminOnly`)
- `adminAuth.js` - Admin JWT (`adminAuth`, `superAdminOnly`)
- `validation.js` - Input validation
- `rateLimiter.js` - Rate limiting for GBIF/IUCN
- `upload.js` - Multer file upload
- `errorHandler.js` - Global error handling

## 3. FRONTEND ARCHITECTURE

### Pages (`india-s-wild-explorer/src/pages/`)
**Public:** Home, Animals, Plants, Ecosystems, Zones, Conservation, Map, Quiz, Biodiversity, Climate, Compare, ImageRecognition, AnimalDetail, PlantDetail, About, Value
**Admin:** AdminLogin, AdminDashboard

### Admin Components
- `AdminSidebar.tsx` - 8 navigation sections
- `AdminDashboardOverview.tsx` - KPI cards
- `AdminSpeciesManager.tsx` - Species CRUD with pagination
- `AdminPlantManager.tsx` - Plant CRUD with pagination
- `AdminEcosystemManager.tsx` - Ecosystem CRUD (NO pagination)
- `AdminZoneManager.tsx` - Zone CRUD (NO pagination)
- `AdminQuizManager.tsx` - Quiz CRUD with pagination
- `AdminAnalyticsPanel.tsx` - Charts with filters
- `AdminMapDataManager.tsx` - Map coordinate editing
- `AdminDataTable.tsx` - Reusable CRUD table
- `AdminFormModal.tsx` - Reusable form modal
- `AdminAuthGuard.tsx` - Route protection

### Hooks
- `useAdmin.ts` - Admin auth state + `adminFetch()` wrapper

## 4. AUTHENTICATION

### Two Separate Auth Systems
1. **User Auth** (`middleware/auth.js`): `protect`, `adminOnly`
2. **Admin Auth** (`middleware/adminAuth.js`): `adminAuth`, `superAdminOnly`

JWT Secret: `process.env.JWT_SECRET || 'biodiversity_admin_jwt_secret_2024'`
JWT Expiry: `7d`
Admin roles: `superadmin`, `admin`, `editor`

## 5. DATA FLOW

### Species CRUD Flow
```
Frontend (AdminSpeciesManager)
  → adminFetch('/species', { method: 'POST', body: FormData })
  → adminRoutes.js POST /species → adminController.createSpecies
  → Multer saves images to /uploads/
  → Species.create() → MongoDB
```

### Image Recognition Flow
```
Frontend → POST /api/recognize (multipart/form-data)
  → imageRecognitionController.recognizeSpecies()
  → Python AI service (localhost:8000/predict)
  → MobileNetV2 inference → predictions
  → Saves to PredictionHistory → returns result
```

## 6. KNOWN ISSUES / GAPS

### Critical Issues
1. **Zone Manager field mismatch**: Frontend sends `name` but backend model uses `zoneName`
2. **Ecosystem Manager field mismatch**: Frontend sends `type` in form but backend expects it
3. **No pagination** in Ecosystem/Zone managers (species/plants have it)
4. **Species Manager filters by ecosystem/zone ID** but backend expects names

### Model Field Mismatches
- **Zone model**: field is `zoneName`, frontend sends `name`
- **Ecosystem model**: field is `name`, frontend sends correctly
- **Species update**: `ecosystem`/`zone` sent as ObjectId strings but backend expects names

## 7. AI/ML SERVICE

**Location**: `backend/ai_service/`
**Stack**: FastAPI + TensorFlow/Keras + MobileNetV2
**Endpoint**: `POST /predict` (port 8000)
**Fallback**: Hardcoded mock predictions when TensorFlow unavailable

## 8. EXTERNAL APIS
- **GBIF** - Species search, occurrence data
- **IUCN Red List** - Conservation status
- **Wikipedia/Wikimedia** - Species images (fallback)
- **Unsplash/Pexels** - Primary image sources
