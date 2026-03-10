const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Species = require("../models/Species");
const Ecosystem = require("../models/Ecosystem");
const Zone = require("../models/Zone");
const QuizQuestion = require("../models/QuizQuestion");
const User = require("../models/User");

const speciesData = [
  {
    name: "Bengal Tiger",
    scientificName: "Panthera tigris tigris",
    type: "Mammal",
    zone: "Indo-Gangetic Plain",
    ecosystem: "Tropical Forest",
    population: 2967,
    habitatLoss: 70,
    pollutionLevel: 40,
    climateRisk: 55,
    conservationStatus: "Endangered",
    description: "The Bengal tiger is the most numerous tiger subspecies. It inhabits the Indian subcontinent.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Tiger_in_Ranthambhore.jpg/320px-Tiger_in_Ranthambhore.jpg",
  },
  {
    name: "Indian Elephant",
    scientificName: "Elephas maximus indicus",
    type: "Mammal",
    zone: "Western Ghats",
    ecosystem: "Tropical Forest",
    population: 27312,
    habitatLoss: 65,
    pollutionLevel: 30,
    climateRisk: 45,
    conservationStatus: "Endangered",
    description: "The Indian elephant is one of three recognized subspecies of the Asian elephant.",
    image: "",
  },
  {
    name: "Snow Leopard",
    scientificName: "Panthera uncia",
    type: "Mammal",
    zone: "Himalayan",
    ecosystem: "Alpine Meadow",
    population: 4500,
    habitatLoss: 60,
    pollutionLevel: 20,
    climateRisk: 80,
    conservationStatus: "Vulnerable",
    description: "The snow leopard is a large cat native to the mountain ranges of Central and South Asia.",
    image: "",
  },
  {
    name: "Indian Peafowl",
    scientificName: "Pavo cristatus",
    type: "Bird",
    zone: "Deccan Plateau",
    ecosystem: "Grassland",
    population: 100000,
    habitatLoss: 20,
    pollutionLevel: 15,
    climateRisk: 25,
    conservationStatus: "Safe",
    description: "The Indian peafowl is the national bird of India, known for its iridescent tail feathers.",
    image: "",
  },
  {
    name: "Ganges River Dolphin",
    scientificName: "Platanista gangetica",
    type: "Mammal",
    zone: "Indo-Gangetic Plain",
    ecosystem: "Freshwater River",
    population: 3500,
    habitatLoss: 75,
    pollutionLevel: 85,
    climateRisk: 60,
    conservationStatus: "Endangered",
    description: "Also called the susu, it is the national aquatic animal of India.",
    image: "",
  },
  {
    name: "Great Indian Bustard",
    scientificName: "Ardeotis nigriceps",
    type: "Bird",
    zone: "Thar Desert",
    ecosystem: "Grassland",
    population: 150,
    habitatLoss: 90,
    pollutionLevel: 35,
    climateRisk: 70,
    conservationStatus: "Critically Endangered",
    description: "One of the heaviest flying birds, critically endangered due to hunting and habitat loss.",
    image: "",
  },
];

const ecosystemData = [
  {
    name: "Tropical Forest",
    description: "Dense forests with high biodiversity found in the Western Ghats and Northeast India.",
    keySpecies: ["Bengal Tiger", "Indian Elephant", "King Cobra"],
    zone: "Western Ghats",
    majorThreats: ["Deforestation", "Poaching", "Climate Change"],
  },
  {
    name: "Freshwater River",
    description: "River systems including the Ganges, Brahmaputra, and their tributaries.",
    keySpecies: ["Ganges River Dolphin", "Gharial", "Mahseer Fish"],
    zone: "Indo-Gangetic Plain",
    majorThreats: ["Pollution", "Damming", "Sand Mining"],
  },
  {
    name: "Alpine Meadow",
    description: "High-altitude grasslands and meadows in the Himalayan region.",
    keySpecies: ["Snow Leopard", "Himalayan Tahr", "Red Panda"],
    zone: "Himalayan",
    majorThreats: ["Climate Change", "Overgrazing", "Tourism"],
  },
  {
    name: "Grassland",
    description: "Open grasslands and savannas found in central and peninsular India.",
    keySpecies: ["Indian Peafowl", "Great Indian Bustard", "Blackbuck"],
    zone: "Deccan Plateau",
    majorThreats: ["Agricultural Expansion", "Invasive Species", "Drought"],
  },
];

const zoneData = [
  {
    zoneName: "Himalayan",
    statesCovered: ["Jammu & Kashmir", "Himachal Pradesh", "Uttarakhand", "Sikkim", "Arunachal Pradesh"],
    keySpecies: ["Snow Leopard", "Red Panda", "Himalayan Black Bear"],
    ecosystems: ["Alpine Meadow", "Temperate Forest", "Glacial"],
    description: "The Himalayan zone covers the northern mountain ranges of India with extreme altitudinal variation.",
  },
  {
    zoneName: "Indo-Gangetic Plain",
    statesCovered: ["Punjab", "Haryana", "Uttar Pradesh", "Bihar", "West Bengal"],
    keySpecies: ["Bengal Tiger", "Ganges River Dolphin", "One-Horned Rhino"],
    ecosystems: ["Tropical Forest", "Freshwater River", "Wetland"],
    description: "The fertile plains of northern India, home to the Ganges river system and dense human populations.",
  },
  {
    zoneName: "Western Ghats",
    statesCovered: ["Kerala", "Karnataka", "Tamil Nadu", "Maharashtra", "Goa"],
    keySpecies: ["Indian Elephant", "Tiger", "Lion-tailed Macaque"],
    ecosystems: ["Tropical Forest", "Shola Forest", "Montane Grassland"],
    description: "UNESCO World Heritage site, one of the eight hottest biodiversity hotspots in the world.",
  },
  {
    zoneName: "Deccan Plateau",
    statesCovered: ["Telangana", "Andhra Pradesh", "Maharashtra", "Karnataka"],
    keySpecies: ["Indian Peafowl", "Sloth Bear", "Indian Wolf"],
    ecosystems: ["Grassland", "Dry Deciduous Forest", "Scrubland"],
    description: "The large plateau region of central and southern India with diverse dry ecosystems.",
  },
  {
    zoneName: "Thar Desert",
    statesCovered: ["Rajasthan", "Gujarat"],
    keySpecies: ["Great Indian Bustard", "Indian Wild Ass", "Desert Fox"],
    ecosystems: ["Desert", "Grassland", "Salt Marsh"],
    description: "The world's 17th largest desert, home to unique desert-adapted wildlife.",
  },
];

const quizData = [
  {
    question: "Which is the national animal of India?",
    options: ["Lion", "Bengal Tiger", "Elephant", "Snow Leopard"],
    correctAnswer: 1,
    category: "Species",
    difficulty: "Easy",
  },
  {
    question: "What is the conservation status of the Great Indian Bustard?",
    options: ["Vulnerable", "Endangered", "Critically Endangered", "Near Threatened"],
    correctAnswer: 2,
    category: "Conservation",
    difficulty: "Medium",
  },
  {
    question: "The Ganges River Dolphin is the national aquatic animal of which country?",
    options: ["Bangladesh", "Nepal", "India", "Pakistan"],
    correctAnswer: 2,
    category: "Species",
    difficulty: "Easy",
  },
  {
    question: "Which biogeographical zone of India is a UNESCO World Heritage Site?",
    options: ["Himalayan Zone", "Thar Desert", "Western Ghats", "Deccan Plateau"],
    correctAnswer: 2,
    category: "Zone",
    difficulty: "Medium",
  },
  {
    question: "What primary threat does the Snow Leopard face?",
    options: ["Poaching only", "Climate Change & Habitat Loss", "Pollution", "Invasive Species"],
    correctAnswer: 1,
    category: "Conservation",
    difficulty: "Medium",
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB for seeding...");

    // Clear existing data
    await Promise.all([
      Species.deleteMany(),
      Ecosystem.deleteMany(),
      Zone.deleteMany(),
      QuizQuestion.deleteMany(),
    ]);
    console.log("🗑️  Cleared existing data");

    // Insert seed data
    await Species.insertMany(speciesData);
    console.log(`✅ Seeded ${speciesData.length} species`);

    await Ecosystem.insertMany(ecosystemData);
    console.log(`✅ Seeded ${ecosystemData.length} ecosystems`);

    await Zone.insertMany(zoneData);
    console.log(`✅ Seeded ${zoneData.length} zones`);

    await QuizQuestion.insertMany(quizData);
    console.log(`✅ Seeded ${quizData.length} quiz questions`);

    // Create default admin user
    const existingAdmin = await User.findOne({ email: "admin@biodiversity.com" });
    if (!existingAdmin) {
      await User.create({
        name: "Admin",
        email: "admin@biodiversity.com",
        password: "Admin@123",
        role: "admin",
      });
      console.log("✅ Created admin user: admin@biodiversity.com / Admin@123");
    }

    console.log("\n🌿 Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error.message);
    process.exit(1);
  }
};

seedDatabase();
