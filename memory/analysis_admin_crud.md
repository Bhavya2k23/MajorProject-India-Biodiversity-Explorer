---
name: admin_crud_analysis
description: Admin CRUD operations - full field mapping, validation, and fix documentation
type: reference
---

# Admin CRUD Operations Analysis

## Summary

The admin CRUD system was **already fully implemented** at the architecture level:
- All backend CRUD APIs exist with proper validation
- JWT-protected routes via `adminAuth` middleware
- Frontend UI with forms, toasts, and loading states
- Instant database updates with frontend refresh

**Critical issues existed** at the **field-mapping layer** between frontend forms and backend models.

---

## Field Mapping Fixes Applied: 2026-04-16-4

### Zone Model vs Frontend
| Frontend Form Field | Backend Model Field | Status |
|---|---|---|
| `name` | `zoneName` | FIXED - backend maps `name` → `zoneName` |
| `states` | `statesCovered` | FIXED - backend maps |
| `area` | `area` | OK |
| `keySpecies` | `keySpecies` | OK |
| `threats` | `ecosystems` | FIXED - backend maps |
| `imageUrl` | `image` | FIXED - backend maps |

### Ecosystem Model vs Frontend
| Frontend Form Field | Backend Model Field | Status |
|---|---|---|
| `name` | `name` | OK |
| `description` | `description` | OK |
| `zone` | `zone` | OK |
| `area` | `area` | OK |
| `keyFeatures` | `keySpecies` | FIXED - backend maps |
| `threats` | `majorThreats` | FIXED - backend maps |
| `imageUrl` | `image` | FIXED - backend maps |

### Species Model Requirements
| Field | Required | Default if Missing |
|---|---|---|
| `type` | Yes | `Mammal` |
| `population` | Yes | `0` |
| `habitatLoss` | Yes | `50` |
| `pollutionLevel` | Yes | `50` |
| `climateRisk` | Yes | `50` |
| `zone` | Yes | From form |
| `ecosystem` | Yes | From form |
| `conservationStatus` | Yes | From form |

### Species Frontend → Backend
| Frontend Form | Backend | Status |
|---|---|---|
| `ecosystem` (dropdown value = name) | String (name) | FIXED - dropdown now uses name not ID |
| `zone` (dropdown value = zoneName) | String (name) | FIXED - dropdown now uses name not ID |
| `lat`, `lng`, `locationName` | `coordinates` object | FIXED - backend maps |
| `images` (files) | `images[]` + `image` | OK |
| `threats` (comma string) | `threats[]` | OK |
| `funFacts` (comma string) | `funFacts[]` | OK |

---

## Backend Validation

### Species
- `name`: required, trimmed, unique
- `scientificName`: required, trimmed
- `type`: enum (Mammal, Bird, Reptile, Amphibian, Fish, Insect, etc.)
- `zone`: required, string
- `ecosystem`: required, string
- `population`: required, integer >= 0
- `conservationStatus`: enum IUCN categories
- `habitatLoss`, `pollutionLevel`, `climateRisk`: 0-100

### Plants
- `name`: required
- `scientificName`: required
- `type`: enum (Tree, Shrub, Herb, etc.)
- `zone`, `ecosystem`: required
- `conservationStatus`: enum IUCN categories

### Ecosystems
- `name`: required, unique
- `description`: required
- `zone`: string
- `keySpecies`: array of strings
- `majorThreats`: array of strings

### Zones
- `zoneName`: required, unique
- `description`: required
- `statesCovered`: array of strings
- `keySpecies`: array of strings

---

## Backend Controller Field Mapping

### createEcosystem (FIXED)
```javascript
{
  name: data.name,
  description: data.description || '',
  zone: data.states || '', // frontend 'states' → model 'zone'
  keySpecies: data.keyFeatures ? split(',') : [],
  majorThreats: data.threats ? split(',') : [],
  area: parseFloat(data.area) || 0,
  image: data.imageUrl || '',
}
```

### createZone (FIXED)
```javascript
{
  zoneName: data.name, // frontend 'name' → model 'zoneName'
  description: data.description || '',
  statesCovered: data.states ? split(',') : [],
  keySpecies: data.keySpecies ? split(',') : [],
  ecosystems: data.threats ? split(',') : [],
  area: parseFloat(data.area) || 0,
  image: data.imageUrl || '',
}
```

### createSpecies (FIXED - adds defaults)
```javascript
{
  type: data.type || 'Mammal',
  population: parseInt(data.population) || 0,
  habitatLoss: clamp(parseInt(data.habitatLoss) || 50, 0, 100),
  pollutionLevel: clamp(parseInt(data.pollutionLevel) || 50, 0, 100),
  climateRisk: clamp(parseInt(data.climateRisk) || 50, 0, 100),
  // ... other fields
}
```
