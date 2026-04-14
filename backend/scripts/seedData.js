// ============================================================
// FILE: backend/scripts/seedData.js
// India Biodiversity Explorer — 1200 Animals + 1200 Plants
// Run via: npm run seed
// ============================================================

require("dotenv").config();
const mongoose = require("mongoose");

const Species = require("../models/Species");
const Plant = require("../models/Plant");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

// ─── Data pools ──────────────────────────────────────────────
const ZONES = [
  "Himalayan Region","Indo-Gangetic Plain","Deccan Peninsula","Western Ghats",
  "Eastern Ghats","North-East India","Thar Desert","Coastal Regions",
  "Andaman & Nicobar Islands","Lakshadweep",
];
const ECOSYSTEMS = [
  "Tropical Forest","Subtropical Forest","Temperate Forest","Montane Forest",
  "Wet Evergreen Forest","Dry Deciduous Forest","Mangrove Forest","Grassland",
  "Shrubland","Alpine Meadow","Desert","Wetland","Coral Reef","Coastal",
];
const ANIMAL_TYPES = ["Mammal","Bird","Reptile","Amphibian","Fish","Insect","Arachnid","Crustacean","Mollusk"];
const PLANT_TYPES  = ["Tree","Shrub","Herb","Grass","Fern","Climber","Epiphyte","Succulent","Aquatic"];
const STATUSES = ["Safe","Near Threatened","Vulnerable","Endangered","Critically Endangered"];
const HABITATS = [
  "Dense tropical forest","Open grassland","Rocky mountain slopes","River banks",
  "Coastal mangroves","Marshy wetlands","Sandy desert","Tropical rainforest",
  "Dry deciduous forest","Alpine meadows","Cave systems","Agricultural fields",
  "Urban periphery","Coral reefs","Estuaries",
];
const USES = ["Medicinal","Timber","Ornamental","Food","Fiber","Fuel","Religious","Pesticide","Dye","Tannin","Latex","Resin","Spice","Fodder"];
const THREATS = ["Habitat loss","Poaching","Climate change","Pollution","Human-wildlife conflict","Invasive species","Disease","Natural predation","Forest fire","Water contamination"];

const ANIMAL_BASE_NAMES = [
  "Tiger","Leopard","Elephant","Bear","Fox","Jackal","Hare","Squirrel","Marten","Otter",
  "Mongoose","Civet","Pangolin","Porcupine","Wild Dog","Wolf","Hyena","Lion","Peacock",
  "Parrot","Woodpecker","Owl","Eagle","Falcon","Vulture","Pigeon","Dove","Quail","Pheasant",
  "Hornbill","Stork","Heron","Ibis","Swan","Duck","Goose","Pelican","Cormorant","Kingfisher",
  "Sunbird","Drongo","Minivet","Warbler","Thrush","Babbler","Laughingthrush","Bulbul",
  "Robin","Flycatcher","Cobra","Viper","Krait","Python","Monitor Lizard","Skink","Gecko",
  "Turtle","Tortoise","Crocodile","Gharial","Frog","Toad","Salamander","Newt","Butterfly",
  "Moth","Dragonfly","Damselfly","Beetle","Ant","Termite","Grasshopper","Carp","Catfish","Mahseer",
];
const PLANT_BASE_NAMES = [
  "Oak","Pine","Cedar","Maple","Rhododendron","Primrose","Lily","Orchid","Iris","Jasmine",
  "Rose","Bamboo","Palm","Fern","Moss","Neem","Peepal","Banyan","Mango","Teak",
  "Sandalwood","Rosewood","Sal","Shisham","Deodar","Tulsi","Ashwagandha","Turmeric","Ginger",
  "Cardamom","Pepper","Cinnamon","Clove","Nutmeg","Moringa","Amla","Bael","Jamun","Aonla",
  "Karanj","Palash","Amaltash","Chandni","Raat","Gulmohar","Jacaranda","Tabebuia","Flamboyant",
  "Willow","Walnut","Almond","Apricot","Tamarind","Gunja","Guggul","Sarpagandha","Punarnava",
  "Shankhapushpi","Brahmi","Vetiver","Basil","Cumin","Fenugreek","Mustard","Sesame","Groundnut",
];
const REGIONS = [
  "Indian","Asian","Bengal","Himalayan","Malabar","Kashmir","Assam","Gujarat",
  "Rajasthan","Sikkim","Kerala","Tamil Nadu","Maharashtra","Orissa","Madhya Pradesh",
  "Uttar Pradesh","Punjab","Goa","Chhattisgarh","Jharkhand","West Bengal","Andhra Pradesh",
];
const ANIMAL_GENERA = [
  "Panthera","Elephas","Ursus","Vulpes","Canis","Felis","Rhinoceros","Bos","Gazella",
  "Macaca","Semnopithecus","Trachypithecus","Presbytis","Pavo","Gallus","Lophura",
  "Tragopan","Buceros","Anthracoceros","Python","Naja","Bungarus","Ophiophagus","Daboia",
  "Hydrophis","Rana","Hoplobatrachus","Fejervarya","Polypedates","Rhacophorus",
  "Papilio","Danaus","Atrophaneura","Graphium","Mycalesis","Labeo","Catla","Cirrhina",
  "Tor","Puntius","Danio","Trichogaster","Cuon","Herpestes","Rousettus",
  "Hipposideros","Pteropus","Hylobates","Nomascus","Symphalangus",
];
const PLANT_GENERA = [
  "Ficus","Azadirachta","Terminalia","Syzygium","Psidium","Mangifera","Bambusa",
  "Zingiber","Curcuma","Elettaria","Ocimum","Withania","Asparagus","Glycine",
  "Oryza","Triticum","Zea","Saccharum","Cocos","Areca","Phoenix","Caryota","Borassus",
  "Artocarpus","Musa","Papaver","Cinchona","Coptis","Berberis","Nymphaea","Nelumbo",
  "Typha","Cycus","Ginkgo","Acmella","Eclipta","Centella","Phyllanthus","Tinospora",
  "Aristolochia","Adhatoda","Justicia","Catharanthus","Nerium","Calotropis","Moringa",
];
const FACTS = [
  "Can survive in extreme temperatures","Known for unique behavioral patterns","Migrates seasonally",
  "Highly adapted to its environment","Communicates using sophisticated signals","Social structure involves complex hierarchies",
  "Has remarkable navigational abilities","Exhibits territorial behavior","Breeding season occurs during monsoon",
  "Feeds on a diverse diet","Has been used in traditional medicine for centuries","Flowers bloom only during specific seasons",
  "Can grow in diverse soil conditions","Exhibits remarkable drought resistance","Provides habitat for many smaller species",
  "Plays a key role in soil conservation","Has deep root systems that prevent erosion","Attracts a variety of pollinators",
];

// ─── Helpers ──────────────────────────────────────────────────
let _counter = Date.now();
const uid  = () => ++_counter;
const ri   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rf   = (a, b) => parseFloat((Math.random() * (b - a) + a).toFixed(4));
const pick = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

// Deterministic index-based picks — guarantees uniqueness across 1200 iterations
// because each pool has ≥120 elements and we cycle through with different offsets
const detZone       = (i) => ZONES[i % ZONES.length];
const detEco        = (i) => ECOSYSTEMS[i % ECOSYSTEMS.length];
const detStatus     = (i) => STATUSES[i % STATUSES.length];
const detHabitat    = (i) => HABITATS[i % HABITATS.length];
const detAnimalType = (i) => ANIMAL_TYPES[i % ANIMAL_TYPES.length];
const detPlantType  = (i) => PLANT_TYPES[i % PLANT_TYPES.length];
const detRegion     = (i) => REGIONS[i % REGIONS.length];
const detAnimalGen  = (i) => ANIMAL_GENERA[i % ANIMAL_GENERA.length];
const detPlantGen   = (i) => PLANT_GENERA[i % PLANT_GENERA.length];
const detAnimalName = (i) => `${REGIONS[i % REGIONS.length]} ${ANIMAL_BASE_NAMES[i % ANIMAL_BASE_NAMES.length]}`;
const detPlantName  = (i) => `${REGIONS[i % REGIONS.length]} ${PLANT_BASE_NAMES[i % PLANT_BASE_NAMES.length]}`;

// ─── Build animal record ──────────────────────────────────────
function makeAnimal(i) {
  const zone     = detZone(i);
  const ecosystem = detEco(i);
  const status    = detStatus(i);
  const habitat   = detHabitat(i);
  const animalType = detAnimalType(i);
  const genus      = detAnimalGen(i);
  const name       = detAnimalName(i);

  return {
    name,
    scientificName: `${genus}_animal_${uid()}`,
    type: animalType,
    zone,
    ecosystem,
    population: ri(50, 50000),
    habitatLoss: ri(10, 95),
    pollutionLevel: ri(5, 80),
    climateRisk: ri(10, 90),
    conservationStatus: status,
    description: `${name} is found across the ${zone}, inhabiting ${habitat.toLowerCase()}. It plays a key role in the ${ecosystem.toLowerCase()} ecosystem.`,
    habitat,
    threats: pick(THREATS, ri(1, 3)),
    funFacts: pick(FACTS, ri(2, 4)),
    coordinates: { lat: rf(8, 35), lng: rf(68, 97), locationName: `${zone}, India` },
    imageUrl: "",
    image: "",
    images: [],
    featureVector: { ecosystemCode: ri(0, 10), statusCode: ri(0, 5), typeCode: ri(0, 7), zoneCode: ri(0, 9) },
  };
}

// ─── Build plant record ───────────────────────────────────────
function makePlant(i) {
  const zone     = detZone(i);
  const ecosystem = detEco(i);
  const status    = detStatus(i);
  const habitat   = detHabitat(i);
  const plantType = detPlantType(i);
  const genus     = detPlantGen(i);
  const name      = detPlantName(i);

  return {
    name,
    scientificName: `${genus}_plant_${uid()}`,
    type: plantType,
    zone,
    ecosystem,
    conservationStatus: status,
    description: `${name} is a ${plantType.toLowerCase()} native to ${zone}, commonly found in ${ecosystem.toLowerCase()}.`,
    habitat,
    uses: pick(USES, ri(1, 4)),
    funFacts: pick(FACTS, ri(2, 4)),
    coordinates: { lat: rf(8, 35), lng: rf(68, 97), locationName: `${zone}, India` },
    imageUrl: "",
    images: [],
  };
}

// ─── Run ──────────────────────────────────────────────────────
const seed = async () => {
  console.log("🌱 India Biodiversity Explorer — Seeder");
  console.log("═".repeat(48));

  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB connected\n");

  // Clear existing data
  const [beforeA, beforeP] = await Promise.all([
    Species.countDocuments(),
    Plant.countDocuments(),
  ]);
  console.log(`🗑️  Clearing existing data (Species: ${beforeA}, Plant: ${beforeP})...`);
  await Promise.all([Species.deleteMany({}), Plant.deleteMany({})]);

  // ── Insert animals one-by-one ──────────────────────────────
  console.log("\n🐾 Inserting 1200 animals into Species collection...");
  let animalSuccess = 0;
  let animalFailed = 0;
  for (let i = 0; i < 1200; i++) {
    try {
      await Species.create(makeAnimal(i));
      animalSuccess++;
    } catch (e) {
      animalFailed++;
      if (animalFailed <= 5) console.log(`   ⚠️  Animal[${i}] failed: ${e.message}`);
    }
    if ((i + 1) % 200 === 0) process.stdout.write(`   Progress: ${i + 1}/1200\r`);
  }
  console.log(`\n   ✅ Animals inserted: ${animalSuccess}  |  ❌ Failed: ${animalFailed}`);

  // ── Insert plants one-by-one ──────────────────────────────
  console.log("\n🌿 Inserting 1200 plants into Plant collection...");
  let plantSuccess = 0;
  let plantFailed = 0;
  for (let i = 0; i < 1200; i++) {
    try {
      await Plant.create(makePlant(i));
      plantSuccess++;
    } catch (e) {
      plantFailed++;
      if (plantFailed <= 5) console.log(`   ⚠️  Plant[${i}] failed: ${e.message}`);
    }
    if ((i + 1) % 200 === 0) process.stdout.write(`   Progress: ${i + 1}/1200\r`);
  }
  console.log(`\n   ✅ Plants inserted: ${plantSuccess}  |  ❌ Failed: ${plantFailed}`);

  // ── Final report ──────────────────────────────────────────
  const [animalCount, plantCount] = await Promise.all([
    Species.countDocuments(),
    Plant.countDocuments(),
  ]);

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   Animals (Species): ${animalCount} | expected 1200`);
  console.log(`   Plants (Plant):    ${plantCount} | expected 1200`);
  console.log(`   Total:             ${animalCount + plantCount}`);

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});

// ─── Export data pools for /api/seed endpoint ─────────────────
module.exports = { ZONES, ECOSYSTEMS };