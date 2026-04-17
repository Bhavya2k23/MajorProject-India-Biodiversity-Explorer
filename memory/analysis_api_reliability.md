---
name: api_reliability_analysis
description: Backend API reliability analysis - timeout handling, fallback responses, error messages
type: reference
---

# API Reliability Analysis - 2026-04-17

## BACKEND CONTROLLERS - ERROR HANDLING GAPS

### 1. adminController.getDashboardStats (lines 125-257)
**Issue**: Uses Promise.all for 10+ queries. If ANY fails, entire response fails.
**Fix needed**: Wrap each query in try/catch, return partial data with warning.

### 2. mapController.getMapSpecies (lines 67-180)
**Issue**: Promise.all for animals + plants. If plants fail, no map data returns.
**Fix needed**: Fetch independently, combine results with warnings.

### 3. speciesController.getRecommendations (lines 193-246)
**Issue**: No fallback if recommendationService.getRecommendations throws.
**Fix needed**: Add try/catch with fallback empty array.

### 4. chatbotController.chatbot
**Issue**: No timeout on DB queries.
**Fix needed**: Add timeout wrapper with fallback message.

### 5. searchController.globalSearch
**Issue**: No timeout on 4-collection search.
**Fix needed**: Add Promise.race timeout.

### 6. server.js
**Issue**: Missing `trust proxy` for rate limiter IP detection.
**Fix needed**: Add `app.set('trust proxy', 1)`.

## FRONTEND HOOKS - ERROR HANDLING GAPS

### 1. useSpeciesData.loadMore (line 318-319)
**Issue**: Catches errors but only logs to console - user sees no error.
**Fix needed**: Call setError for loadMore failures.

### 2. useSpeciesDetail (lines 86-152)
**Issue**: No retry mechanism, no AbortController.
**Fix needed**: Add retry logic + AbortController for cleanup.

### 3. imageRecognitionService.ts (lines 26-56)
**Issue**: No retry interceptor on axios instance.
**Fix needed**: Add retry interceptor with exponential backoff.

## APP-level PROTECTION

### App.tsx (line 138-172)
**Status**: Has ErrorBoundary wrapping Routes (GOOD), but no top-level fallback for Suspense failures.