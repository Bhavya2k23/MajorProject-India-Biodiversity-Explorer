// Seed script for Zones and Ecosystems
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Zone = require("../models/Zone");
const Ecosystem = require("../models/Ecosystem");

const zones = [
  {
    zoneName: "Trans-Himalayan",
    description: "Cold desert ecosystem in the high-altitude Himalayan rain shadow. Features unique adapted species like the Snow Leopard and Tibetan Antelope.",
    statesCovered: ["Ladakh", "Lahaul-Spiti", "Zanskar"],
    keySpecies: ["Snow Leopard", "Tibetan Wild Ass", "Tibetan Antelope", "Bharal", "Argali"],
    ecosystems: ["Alpine Meadow", "Cold Desert"],
    area: 185000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Ladakh_from_the_road.jpg/800px-Ladakh_from_the_road.jpg",
  },
  {
    zoneName: "Himalayan",
    description: "Rich temperate and alpine forests spanning from Jammu & Kashmir to Arunachal Pradesh. One of the most biodiverse mountain ecosystems in the world.",
    statesCovered: ["Jammu & Kashmir", "Himachal Pradesh", "Uttarakhand", "Sikkim", "Arunachal Pradesh", "West Bengal (Darjeeling)"],
    keySpecies: ["Red Panda", "Himalayan Brown Bear", "Snow Leopard", "Musk Deer", "Monal"],
    ecosystems: ["Tropical Forest", "Alpine Meadow", "Temperate Forest"],
    area: 230000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Kangchenjunga_from_Gorime.jpg/800px-Kangchenjunga_from_Gorime.jpg",
  },
  {
    zoneName: "Thar Desert",
    description: "The great Indian desert spanning Rajasthan, Gujarat, and parts of Punjab. Features extreme temperature variations and uniquely adapted flora and fauna.",
    statesCovered: ["Rajasthan", "Gujarat", "Punjab", "Haryana"],
    keySpecies: ["Great Indian Bustard", "Asiatic Lion", "Caracal", "Desert Fox", "Indian Wild Ass"],
    ecosystems: ["Desert", "Semi-Arid Scrub"],
    area: 320000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Thar_Desert.jpg/800px-Thar_Desert.jpg",
  },
  {
    zoneName: "Indo-Gangetic Plain",
    description: "The vast alluvial plains of the Indus and Ganges river systems, supporting some of the highest population densities of large mammals including the Bengal Tiger.",
    statesCovered: ["Punjab", "Haryana", "Uttar Pradesh", "Bihar", "West Bengal", "Delhi"],
    keySpecies: ["Bengal Tiger", "Asian Elephant", "Gharial", "One-horned Rhinoceros", "Gangetic Dolphin"],
    ecosystems: ["Tropical Forest", "Wetland", "Grassland"],
    area: 770000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/India_-_Varanasi_-_0168.jpg/800px-India_-_Varanasi_-_0168.jpg",
  },
  {
    zoneName: "Eastern Ghats",
    description: "Ancient mountain range along India's eastern coast, supporting endemic species found nowhere else in the world. Rich in mineral deposits and biodiversity.",
    statesCovered: ["Odisha", "Andhra Pradesh", "Telangana", "Tamil Nadu"],
    keySpecies: ["Golden Gecko", "Indian Elephant", "Bengal Tiger", "Mouse Deer", "Rusty-spotted Cat"],
    ecosystems: ["Tropical Forest", "Dry Deciduous Forest", "Scrubland"],
    area: 175000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Eastern_Ghats.jpg/800px-Eastern_Ghats.jpg",
  },
  {
    zoneName: "Western Ghats",
    description: "UNESCO World Heritage Site and one of the world's top 8 biodiversity hotspots. Runs along India's western coast through Maharashtra, Goa, Karnataka, Kerala, and Tamil Nadu.",
    statesCovered: ["Maharashtra", "Goa", "Karnataka", "Kerala", "Tamil Nadu"],
    keySpecies: ["Lion-tailed Macaque", "Nilgiri Tahr", "Purple Frog", "Malabar Giant Squirrel", "Kaveri Elephant"],
    ecosystems: ["Rainforest", "Deciduous Forest", "Shola Forest", "Wetland"],
    area: 140000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Scenery_of_Western_Ghats.jpg/800px-Scenery_of_Western_Ghats.jpg",
  },
  {
    zoneName: "Deccan Plateau",
    description: "The large triangular peninsular plateau of India, characterized by dry deciduous forests, scrublands, and unique wildlife adapted to seasonal drought conditions.",
    statesCovered: ["Madhya Pradesh", "Chhattisgarh", "Maharashtra", "Karnataka", "Andhra Pradesh"],
    keySpecies: ["Sloth Bear", "Indian Fox", "Indian Pangolin", "Gaur", "Four-horned Antelope"],
    ecosystems: ["Dry Deciduous Forest", "Scrubland", "Grassland"],
    area: 420000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Deccan_Plateau.jpg/800px-Deccan_Plateau.jpg",
  },
  {
    zoneName: "Coastal",
    description: "India's extensive coastline spanning the Arabian Sea, Bay of Bengal, and Indian Ocean. Supports mangrove ecosystems, coral reefs, and marine biodiversity.",
    statesCovered: ["Gujarat", "Maharashtra", "Goa", "Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Odisha", "West Bengal"],
    keySpecies: ["Saltwater Crocodile", "Olive Ridley Turtle", "Mugger Crocodile", "Fishing Cat", "Spoon-billed Sandpiper"],
    ecosystems: ["Mangrove", "Coastal Wetland", "Coral Reef", "Mudflat"],
    area: 0,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Coastal_mangrove.jpg/800px-Coastal_mangrove.jpg",
  },
  {
    zoneName: "Islands",
    description: "India's island territories including the Andaman & Nicobar archipelago and Lakshadweep, featuring unique endemic species and some of the most pristine marine ecosystems.",
    statesCovered: ["Andaman & Nicobar Islands", "Lakshadweep"],
    keySpecies: ["Andaman Woodpecker", "Nicobar Megapode", "Andaman Wild Boar", "Giant Robber Crab", "Whale Shark"],
    ecosystems: ["Tropical Rainforest", "Mangrove", "Coral Reef"],
    area: 0,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Andaman_and_Nicobar_Islands.jpg/800px-Andaman_and_Nicobar_Islands.jpg",
  },
  {
    zoneName: "North-East India",
    description: "The biodiversity-rich northeastern states of India, forming part of the Indo-Burma biodiversity hotspot. Features dense rainforests, alpine meadows, and unique endemic species.",
    statesCovered: ["Assam", "Meghalaya", "Nagaland", "Manipur", "Mizoram", "Tripura", "Arunachal Pradesh", "Sikkim"],
    keySpecies: ["Hoolock Gibbon", "One-horned Rhino", "Bengal Tiger", "Asian Elephant", "Giant Hornbill"],
    ecosystems: ["Tropical Rainforest", "Subtropical Forest", "Alpine Meadow", "Wetland"],
    area: 260000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Northeast_India.jpg/800px-Northeast_India.jpg",
  },
];

const ecosystems = [
  {
    name: "Tropical Forest",
    description: "Dense, year-round warm forests with high rainfall, supporting the greatest biodiversity of any terrestrial ecosystem. Features多层 canopy and abundant epiphytes.",
    zone: "Western Ghats",
    keySpecies: ["Bengal Tiger", "Asian Elephant", "Lion-tailed Macaque", "Great Hornbill", "Malabar Tahr"],
    majorThreats: ["Deforestation for agriculture", "Mining", "Hydroelectric projects", "Poaching"],
    area: 370000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Tropical_forest.jpg/800px-Tropical_forest.jpg",
  },
  {
    name: "Mangrove",
    description: "Coastal saltwater forests growing in tidal brackish water, critical for coastal protection, carbon sequestration, and supporting juvenile fish and crustacean populations.",
    zone: "Coastal",
    keySpecies: ["Saltwater Crocodile", "Fishing Cat", "Mugger Crocodile", "Barn Owl", "Estuarine Crocodile"],
    majorThreats: ["Coastal development", "Pollution", "Sea level rise", "Shrimp farming"],
    area: 6800,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mangrove_forest_in_the_Andaman_Islands.jpg/800px-Mangrove_forest_in_the_Andaman_Islands.jpg",
  },
  {
    name: "Alpine Meadow",
    description: "High-altitude grasslands above the treeline in the Himalayas, characterized by seasonal wildflower blooms and adapted fauna like the Snow Leopard and Himalayan Tahr.",
    zone: "Himalayan",
    keySpecies: ["Snow Leopard", "Himalayan Tahr", "Musk Deer", "Bharal", "Monal Pheasant"],
    majorThreats: ["Climate change", "Overgrazing", "Tourism pressure", "Habitat fragmentation"],
    area: 95000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Alpine_meadow_himalayas.jpg/800px-Alpine_meadow_himalayas.jpg",
  },
  {
    name: "Desert",
    description: "Arid ecosystems with extreme temperature variations between day and night. Features drought-adapted flora and specially evolved fauna capable of surviving with minimal water.",
    zone: "Thar Desert",
    keySpecies: ["Great Indian Bustard", "Asiatic Lion", "Caracal", "Desert Fox", "Spiny-tailed Lizard"],
    majorThreats: ["Drought", "Desertification", "Mining", "Solar energy projects"],
    area: 320000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Thar_desert_landscape.jpg/800px-Thar_desert_landscape.jpg",
  },
  {
    name: "Wetland",
    description: "Seasonally or permanently waterlogged areas including marshes, lakes, and river floodplains, providing critical habitat for migratory birds and freshwater species.",
    zone: "Indo-Gangetic Plain",
    keySpecies: ["Gharial", "Mugger Crocodile", "Sarus Crane", "Gangetic Dolphin", "Skimmer"],
    majorThreats: ["Draining for agriculture", "Industrial pollution", "Invasive species", "Water diversion"],
    area: 45000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Sundarbans_Wetland.jpg/800px-Sundarbans_Wetland.jpg",
  },
  {
    name: "Grassland",
    description: "Tropical and subtropical grasslands supporting key species like the Great Indian Bustard and Blackbuck. Often exist in fire-prone or flood-prone regions where trees cannot establish.",
    zone: "Deccan Plateau",
    keySpecies: ["Great Indian Bustard", "Blackbuck", "Nilgai", "Florican", "Wolf"],
    majorThreats: ["Agricultural conversion", "Overgrazing", " invasive grasses", "Infrastructure development"],
    area: 210000,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Indian_grassland.jpg/800px-Indian_grassland.jpg",
  },
  {
    name: "Coastal",
    description: "Sandy and rocky shores along India's 7,500km coastline, supporting nesting sites for turtles, coastal birds, and marine mammals like the Irrawaddy Dolphin.",
    zone: "Coastal",
    keySpecies: ["Olive Ridley Turtle", "Whale Shark", "Dolphin", "Giant Marine Turtle", "Coastal Birds"],
    majorThreats: ["Tourism", "Coastal erosion", "Oil spills", "Plastic pollution"],
    area: 0,
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Indian_coast.jpg/800px-Indian_coast.jpg",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    await Zone.deleteMany({});
    await Ecosystem.deleteMany({});
    console.log("Cleared existing zones and ecosystems");

    await Zone.insertMany(zones);
    console.log(`✅ Seeded ${zones.length} zones`);

    await Ecosystem.insertMany(ecosystems);
    console.log(`✅ Seeded ${ecosystems.length} ecosystems`);

    console.log("\n🎉 Zone & Ecosystem seeding complete!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seed();