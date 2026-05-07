const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Species = require("../models/Species");
const Plant = require("../models/Plant");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ─── Procedural Data Generators ────────────────────────────────────────────────

const regions = [
  "Indian", "Himalayan", "Bengal", "Western Ghats", "Nilgiri", "Andaman", 
  "Malabar", "Deccan", "Ganges", "Assam", "Kashmir", "Thar", "Eastern", 
  "Northern", "Southern", "Central", "Punjabi", "Gujarati", "Goan", "Kerala",
  "Vindhyan", "Satpura", "Aravalli", "Sundarbans", "Coromandel"
];

const animalAdjectives = [
  "Spotted", "Striped", "Golden", "Black", "White", "Red", "Giant", "Dwarf", 
  "Pygmy", "Lesser", "Greater", "Common", "Rare", "Clouded", "Snow", "Swamp", 
  "Desert", "Mountain", "Forest", "River", "Crested", "Horned", "Barking", "Flying", "Slender"
];

const animalBases = [
  "Tiger", "Elephant", "Leopard", "Macaque", "Langur", "Rhinoceros", "Bear", 
  "Wolf", "Fox", "Jackal", "Deer", "Antelope", "Gazelle", "Mongoose", "Civet", 
  "Pangolin", "Porcupine", "Hare", "Squirrel", "Bat", "Dolphin", "Whale", 
  "Turtle", "Tortoise", "Crocodile", "Gharial", "Monitor Lizard", "Gecko", "Skink", 
  "Python", "Cobra", "Viper", "Krait", "Frog", "Toad", "Salamander", "Eagle", 
  "Hawk", "Falcon", "Owl", "Hornbill", "Peafowl", "Pheasant", "Partridge", "Quail", 
  "Crane", "Stork", "Heron", "Egret", "Pelican"
];

const plantAdjectives = [
  "Sacred", "Wild", "Medicinal", "Poisonous", "Fragrant", "Thorny", "Climbing", 
  "Creeping", "Weeping", "Broadleaf", "Narrowleaf", "Silver", "Golden", "Red", 
  "Black", "White", "Blue", "Purple", "Pink", "Yellow", "Orange", "Spotted", 
  "Striped", "Hairy", "Smooth"
];

const plantBases = [
  "Banyan", "Peepal", "Neem", "Teak", "Sal", "Sandalwood", "Bamboo", "Palm", 
  "Fern", "Orchid", "Lotus", "Lily", "Jasmine", "Rose", "Marigold", "Hibiscus", 
  "Tulsi", "Mint", "Coriander", "Mustard", "Cotton", "Jute", "Sugarcane", "Wheat", 
  "Rice", "Millet", "Sorghum", "Maize", "Mango", "Banana", "Papaya", "Guava", 
  "Jackfruit", "Tamarind", "Coconut", "Areca", "Cashew", "Coffee", "Tea", "Rubber", 
  "Eucalyptus", "Pine", "Cedar", "Oak", "Rhododendron", "Cactus", "Aloe", "Agave", 
  "Euphorbia", "Acacia"
];

const statuses = ["safe", "near threatened", "vulnerable", "endangered", "critically endangered"];
const zones = ["North India", "South India", "East India", "West India", "Central India", "Northeast India", "Andaman and Nicobar"];
const ecosystems = ["Tropical Forest", "Deciduous Forest", "Desert", "Alpine", "Coastal", "Wetland", "Grassland", "Mangrove"];

const generateUniqueSet = (count, regionArr, adjArr, baseArr) => {
  const set = new Set();
  const result = [];
  
  while (result.length < count) {
    const r = regionArr[Math.floor(Math.random() * regionArr.length)];
    const a = adjArr[Math.floor(Math.random() * adjArr.length)];
    const b = baseArr[Math.floor(Math.random() * baseArr.length)];
    
    // 50% chance to include adjective for variety
    const commonName = Math.random() > 0.5 ? `${r} ${a} ${b}` : `${r} ${b}`;
    const scientificName = `${b.toLowerCase().replace(/ /g, '')}us ${r.toLowerCase()}ensis`;
    
    if (!set.has(scientificName)) {
      set.add(scientificName);
      
      result.push({
        name: commonName,
        common_name: commonName,
        scientificName: scientificName,
        species_name: scientificName,
        conservationStatus: statuses[Math.floor(Math.random() * statuses.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        zone: zones[Math.floor(Math.random() * zones.length)],
        ecosystem: ecosystems[Math.floor(Math.random() * ecosystems.length)],
        population: Math.floor(Math.random() * 50000) + 100,
        description: `The ${commonName} (${scientificName}) is a deeply significant species found primarily in the ${ecosystems[Math.floor(Math.random() * ecosystems.length)]}s of ${zones[Math.floor(Math.random() * zones.length)]}. It plays a vital ecological role.`,
        type: "Animal",
        images: [],
        imageUrl: ""
      });
    }
  }
  return result;
};

const generateData = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/biodiversity");
    console.log("Connected successfully.");

    console.log("Clearing existing collections to guarantee NO duplicates...");
    await Species.deleteMany({});
    if (Plant) await Plant.deleteMany({});

    console.log("Generating 1500 unique animals...");
    const animals = generateUniqueSet(1500, regions, animalAdjectives, animalBases);
    
    console.log("Generating 1500 unique plants...");
    // Modify generator slightly for plants
    const plants = generateUniqueSet(1500, regions, plantAdjectives, plantBases).map(p => ({
      ...p,
      type: "Plant"
    }));

    console.log("Inserting 1500 Animals into Database...");
    await Species.insertMany(animals);

    console.log("Inserting 1500 Plants into Database...");
    if (Plant) {
       await Plant.insertMany(plants);
    } else {
       // If Plant model doesn't exist, dump everything into Species with type="Plant"
       await Species.insertMany(plants);
    }

    console.log("✅ Successfully injected 3000+ perfectly formatted, unique, image-free items.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed Script Error:", error);
    process.exit(1);
  }
};

generateData();
