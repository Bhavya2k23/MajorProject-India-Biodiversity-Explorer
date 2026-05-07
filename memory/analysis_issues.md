---
name: project_issues
description: ALL CRITICAL ISSUES identified in 2026-04-16 review
type: reference
---

# India Biodiversity Explorer - Critical Issues Analysis

## Issues Identified: 2026-04-16

### Issue 1: Zone Manager Field Name Mismatch
**File**: `AdminZoneManager.tsx` vs `Zone.js` model

**Problem**:
- Zone model has field `zoneName`
- AdminZoneManager sends `name` field in forms
- Backend `createZone` tries to set `zone.zoneName` but form sends `zone.name`

**Affected Operations**: Create, Update

**Fix Required**: Either:
- Change frontend to send `zoneName` field name, OR
- Backend to map `name` → `zoneName`

### Issue 2: Ecosystem Manager Missing Pagination
**File**: `AdminEcosystemManager.tsx`

**Problem**:
- Ecosystem manager fetches ALL ecosystems with no pagination
- Large datasets will cause performance issues

**Status**: LOW PRIORITY - Only ~10-20 ecosystems typically

### Issue 3: Zone Manager Missing Pagination
**File**: `AdminZoneManager.tsx`

**Problem**: Same as ecosystem - no pagination

**Status**: LOW PRIORITY - Only ~10 zones typically

### Issue 4: Species Manager Ecosystem/Zone Filter by ID vs Name
**File**: `AdminSpeciesManager.tsx`

**Problem**:
- `fetchSpecies` builds filter: `ecosystem: filterEco` where `filterEco` is an ObjectId
- Backend `getAllSpeciesAdmin` does: `query.ecosystem = ecosystem` (expects string name, not ObjectId)
- MongoDB stores ecosystem as String (name), not ObjectId reference

**Fix Applied**: Ecosystem/Zone should be filtered by name, not ID

### Issue 5: AdminDataTable `onDelete` Signature Mismatch
**File**: `AdminDataTable.tsx`

**Problem**:
- Props define `onDelete: (id: string, name: string) => void`
- But actual usage calls `onDelete(row._id)` - missing `name` parameter
- Components call with just `id`

**Status**: Works because `name` is optional parameter in implementations

## VALIDATION RULES

### Species Validation (backend)
- `name`: required, trimmed
- `scientificName`: required, trimmed
- `type`: enum (Mammal, Bird, Reptile, etc.)
- `zone`: required
- `ecosystem`: required
- `population`: required, min 0
- `conservationStatus`: enum IUCN categories
- `habitatLoss`: 0-100
- `pollutionLevel`: 0-100
- `climateRisk`: 0-100

### Plant Validation (backend)
- `name`: required
- `scientificName`: required
- `type`: enum (Tree, Shrub, Herb, etc.)
- `zone`: required
- `ecosystem`: required
- `conservationStatus`: enum IUCN categories
