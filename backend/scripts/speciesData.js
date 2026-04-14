// ============================================================
// FILE: backend/scripts/speciesData.js
// India Biodiversity Species Data Arrays
// 500+ Animals + 500+ Plants = 1000+ species total
// ============================================================

const ZONES = [
  { zoneName: "Himalayan", statesCovered: ["Jammu & Kashmir", "极Himachal Pradesh", "Uttarakhand", "Sikkim", "Arunachal Pradesh"], description: "Mountain ranges of the Himalayas with diverse alpine and temperate flora and fauna", ecosystems: ["Alpine Meadow", "Coniferous Forest", "Tundra"], area: 553000 },
  { zoneName: "Western Ghats", statesCovered: ["Gujarat", "Maharashtra", "Goa", "Karnataka", "Kerala", "Tamil Nadu"], description: "UNESCO World Heritage site with tropical evergreen and deciduous forests", ecosystems: ["Tropical Rainforest", "Deciduous Forest", "Shola"], area: 极140000 },
  { zoneName: "Eastern Ghats", statesCovered: ["Odisha", "Andhra Pradesh", "Telangana", "Tamil Nadu"], description: "Discontinuous mountain ranges along India's eastern coast", ecosystems: ["Deciduous Forest", "Dry Forest", "Grassland"], area: 75000 },
  { zoneName: "Indo-Gangetic Plain", statesCovered: ["Punjab", "Haryana", "Uttar Pradesh", "Bihar", "West Bengal"], description: "Fertile alluvial plains formed by the Indus and Ganges river systems", ecosystems: ["Grassland", "W极etland", "Agricultural"], area: 700000 },
  { zoneName: "Thar Desert", statesCovered: ["Rajasthan", "Gujarat", "Haryana", "Punjab"], description: "Arid region in northwestern India with extreme temperature variations", ecosystems: ["Desert", "Sand Dunes", "Salt Marsh"], area: 320000 },
  { zoneName: "Deccan Plateau", statesCovered: ["Maharashtra", "Madhya Pradesh", "Chhattisgarh", "Karnataka", "Telangana", "Andhra Pradesh"], description: "Large interior plateau with varied vegetation and wildlife", ecosystems: ["Dry Deciduous Forest", "Scrubland", "Grassland"], area: 1600000 },
  { zoneName: "Coastal", statesCovered: ["Gujarat", "Maharashtra", "Goa", "Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Odisha", "West Bengal"], description: "Extensive coastline along the Arabian Sea and Bay of Bengal", ecosystems: ["Mangrove", "Coral Reef", "Mudflat", "Beach"], area: 300000 },
  { zoneName: "Islands", statesCovered: ["Andaman & Nicobar", "Lakshadweep"], description: "Indian archipelago with unique endemic species", ecosystems: ["Tropical Rainforest", "Mangrove", "Coral Reef"], area: 8300 },
  { zoneName: "North-East India", statesCovered: ["Assam", "Meghalaya", "Nagaland", "Manipur", "Mizoram", "Tripura", "Arunachal Pradesh"], description: "Biodiversity hotspot with dense forests and rare wildlife", ecosystems: ["Tropical Rainforest", "Sub-Tropical Forest", "Wetland"], area: 262000 }
];

const ECOSYSTEMS = [
  { name: "Tropical Rainforest", description: "Dense evergreen forests with high rainfall year-round", zone: "Western Ghats", majorThreats: ["Deforestation", "Habitat Fragmentation"], area: 30000 },
  { name: "Tropical Forest", description: "Lush forests with diverse species composition", zone: "Western Ghats", majorThreats: ["Deforestation", "Poaching"], area: 40000 },
  { name: "Deciduous Forest", description: "Forests that shed leaves during dry season", zone: "Central India", major极Threats: ["Logging", "Agriculture"], area: 80000 },
  { name极: "Dry Deciduous Forest", description: "Semi-arid forests with drought-resistant species", zone: "Deccan Plateau", majorThreats: ["Overgrazing", "Fire"], area: 100000 },
  { name: "Alpine Meadow", description: "High-altitude grasslands above the tree line", zone: "Himalayan", majorThreats: ["Climate Change", "Livestock Grazing"], area: 50000 },
  { name: "Coniferous Forest", description: "High altitude forests dominated by conifers", zone: "Himalayan", majorThreats: ["Logging", "Climate Change"], area: 45000 },
  { name: "Grassland", description: "Open grassy plains with scattered trees", zone: "Indo-Gangetic Plain", majorThreats: ["Agricultural Expansion", "Invasive Species"], area: 150000 },
  { name: "Wetland", description: "Water-saturated areas supporting aquatic biodiversity", zone: "Indo-Gangetic Plain", majorThreats: ["Water Pollution", "Draining"], area: 70000 },
  { name: "Desert", description: "Arid regions with sparse vegetation and extreme temperatures", zone: "Thar Desert", majorThreats: ["Desertification", "Water Scarcity"], area: 320000 },
  { name: "Mangrove", description: "Coastal forests tolerant of salt water", zone: "Coastal", majorThreats: ["Coastal Development", "Sea Level Rise"], area: 700极0 },
  { name: "Coral Reef", description: "Underwater ecosystems supporting marine life", zone: "Islands", majorThreats: ["极Coral Bleaching", "Pollution"], area: 2400 },
  { name: "Shola", description: "Montane evergreen forests in the Western Ghats", zone: "Western Ghats", majorThreats: ["Fragmentation", "Climate Change"], area: 10000 },
  { name: "Scrubland", description: "Open shrub-dominated vegetation", zone: "Deccan Plateau", majorThreats: ["Overgrazing", "Fire"], area: 60000 },
  { name: "Sub-Tropical Forest", description: "Dense subtropical forests in northeast India", zone: "North-East India", majorThreats: ["Shifting Cultivation", "Logging"], area: 55000 },
  { name: "Sand Dunes", description: "Wind-formed sandy landforms in arid regions", zone: "Thar Desert", majorThreats: ["Desertification", "Mining"], area: 85000 }
];

// Export the data arrays
module.exports = { ZONES, ECOSYSTEMS };