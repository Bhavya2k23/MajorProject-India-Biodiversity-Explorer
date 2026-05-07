const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Species = require("../models/Species");
const Plant = require("../models/Plant");

const ZONES = ["Himalayan", "Western Ghats", "Eastern Ghats", "Indo-Gangetic Plain", "Thar Desert", "Deccan Plateau", "Coastal", "Islands", "North-East India"];
const ANIMAL_ECOSYSTEMS = ["Tropical Forest", "Alpine Meadow", "Grassland", "Wetland", "Desert", "Coastal", "Mangrove"];
const PLANT_ECOSYSTEMS = ["Rainforest", "Deciduous Forest", "Alpine", "Scrubland", "Wetland", "Desert", "Coastal"];
const STATUSES = ["Extinct", "Critically Endangered", "Endangered", "Vulnerable", "Near Threatened", "Safe"];

// 100 Indian Animals
const animalList = [
  "Bengal Tiger", "Indian Elephant", "Snow Leopard", "Indian Rhinoceros", "Asiatic Lion", "Macaque", "Red Panda", "Gharial", "Indian Peafowl", "King Cobra",
  "Sloth Bear", "Indian Leopard", "Blackbuck", "Nilgai", "Barasingha", "Indian Wolf", "Dhole", "Indian Crested Porcupine", "Indian Pangolin", "Fishing Cat",
  "Gaur", "Sambar Deer", "Chital", "Indian Muntjac", "Hoolock Gibbon", "Nilgiri Tahr", "Lion-tailed Macaque", "Indian Boar", "Golden Jackal", "Indian Fox",
  "Striped Hyena", "Jungle Cat", "Leopard Cat", "Rusty-spotted Cat", "Caracal", "Indian Desert Cat", "Binturong", "Asian Small-clawed Otter", "Smooth-coated Otter", "Eurasian Otter",
  "Malabar Giant Squirrel", "Indian Giant Flying Squirrel", "Indian Hare", "Hispid Hare", "Pygmy Hog", "Swamp Deer", "Kashmir Stag", "Tibetan Antelope", "Himalayan Tahr", "Markhor",
  "Argali", "Bharal", "Takin", "Serow", "Goral", "Wild Water Buffalo", "Yak", "Kiang", "Indian Wild Ass", "Great Indian Bustard",
  "Sarus Crane", "Indian Vulture", "Slender-billed Vulture", "Red-headed Vulture", "Egyptian Vulture", "Crested Serpent Eagle", "Changeable Hawk-Eagle", "Indian Spotted Eagle", "Tawny Eagle", "Steppe Eagle",
  "Osprey", "Peregrine Falcon", "Laggar Falcon", "Amur Falcon", "Common Kestrel", "Indian Eagle-Owl", "Brown Fish Owl", "Dusky Eagle-Owl", "Mottled Wood Owl", "Jungle Owlet",
  "Indian Roller", "White-throated Kingfisher", "Common Kingfisher", "Pied Kingfisher", "Green Bee-eater", "Indian Grey Hornbill", "Malabar Pied Hornbill", "Great Hornbill", "Rufous Treepie", "Asian Koel",
  "Greater Coucal", "Indian Pitta", "Purple Sunbird", "Baya Weaver", "Indian Paradise Flycatcher", "Mugger Crocodile", "Saltwater Crocodile", "Indian Python", "Reticulated Python", "Common Krait"
];

// 100 Indian Plants
const plantList = [
  "Banyan", "Peepal", "Neem", "Mango", "Tulsi", "Sandalwood", "Teak", "Sal Tree", "Deodar Cedar", "Indian Rosewood",
  "Ashoka Tree", "Amla", "Bael", "Jackfruit", "Jamun", "Kadam", "Mahua", "Palash", "Tamarind", "Gulmohar",
  "Indian Laburnum", "Flame of the Forest", "Sacred Fig", "Indian Gooseberry", "Indian Jujube", "Coral Tree", "Silk Cotton Tree", "Indian Cork Tree", "Bullet Wood", "Indian Beech",
  "Drumstick Tree", "Indian Mallow", "Indian Pennywort", "Brahmi", "Ashwagandha", "Shatavari", "Aloe Vera", "Turmeric", "Ginger", "Cardamom",
  "Black Pepper", "Cinnamon", "Clove", "Nutmeg", "Indian Bay Leaf", "Curry Tree", "Lemon Grass", "Vetiver", "Indian Madder", "Indigo",
  "Henna", "Soapnut", "Shikakai", "Indian Sarsaparilla", "Malabar Nut", "Long Pepper", "Indian Snakeroot", "Holy Basil", "Sweet Basil", "Mint",
  "Coriander", "Cumin", "Fennel", "Fenugreek", "Mustard", "Sesame", "Castor", "Linseed", "Cotton", "Jute",
  "Sugarcane", "Bamboo", "Rattan", "Coconut", "Areca Nut", "Palmyra Palm", "Date Palm", "Sago Palm", "Traveler's Tree", "Banana",
  "Plantain", "Papaya", "Guava", "Pomegranate", "Fig", "Mulberry", "Grapes", "Watermelon", "Muskmelon", "Cucumber",
  "Bottle Gourd", "Bitter Gourd", "Ridge Gourd", "Sponge Gourd", "Ash Gourd", "Snake Gourd", "Ivy Gourd", "Spine Gourd", "Pointed Gourd", "Taro"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWikiData = async (name) => {
  try {
    const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB. Wiping existing data...");
    
    await Species.deleteMany({});
    await Plant.deleteMany({});

    console.log("Starting Animal Seeding...");
    let animalDocs = [];
    for (let i = 0; i < animalList.length; i++) {
      const name = animalList[i];
      process.stdout.write(`Fetching ${name}... `);
      const wiki = await fetchWikiData(name);
      await sleep(100);

      if (wiki && wiki.extract) {
        animalDocs.push({
          name: name,
          scientificName: wiki.title !== name ? wiki.title : `${name} SP.`,
          type: "Mammal", // Genericized for speed
          zone: ZONES[Math.floor(Math.random() * ZONES.length)],
          ecosystem: ANIMAL_ECOSYSTEMS[Math.floor(Math.random() * ANIMAL_ECOSYSTEMS.length)],
          population: Math.floor(Math.random() * 50000) + 100,
          habitatLoss: Math.floor(Math.random() * 80),
          pollutionLevel: Math.floor(Math.random() * 60),
          climateRisk: Math.floor(Math.random() * 70),
          conservationStatus: STATUSES[Math.floor(Math.random() * STATUSES.length)],
          description: wiki.extract.slice(0, 500),
          imageUrl: wiki.thumbnail ? wiki.thumbnail.source.replace(/\/\d+px-/, "/800px-") : (wiki.originalimage ? wiki.originalimage.source : ""),
          images: wiki.originalimage ? [wiki.originalimage.source] : [],
          threats: ["Habitat Loss", "Climate Change"],
        });
        console.log(`✅`);
      } else {
        console.log(`❌ Skipped`);
      }
    }
    await Species.insertMany(animalDocs);

    console.log("\nStarting Plant Seeding...");
    let plantDocs = [];
    for (let i = 0; i < plantList.length; i++) {
      const name = plantList[i];
      process.stdout.write(`Fetching ${name}... `);
      const wiki = await fetchWikiData(name);
      await sleep(100);

      if (wiki && wiki.extract) {
        plantDocs.push({
          name: name,
          scientificName: wiki.title !== name ? wiki.title : `${name} SP.`,
          type: "Tree",
          zone: ZONES[Math.floor(Math.random() * ZONES.length)],
          ecosystem: PLANT_ECOSYSTEMS[Math.floor(Math.random() * PLANT_ECOSYSTEMS.length)],
          conservationStatus: STATUSES[Math.floor(Math.random() * STATUSES.length)],
          description: wiki.extract.slice(0, 500),
          uses: ["Medicinal", "Timber"],
          imageUrl: wiki.thumbnail ? wiki.thumbnail.source.replace(/\/\d+px-/, "/800px-") : (wiki.originalimage ? wiki.originalimage.source : ""),
        });
        console.log(`✅`);
      } else {
        console.log(`❌ Skipped`);
      }
    }
    await Plant.insertMany(plantDocs);

    console.log(`\n🎉 SEEDING COMPLETE! Added ${animalDocs.length} Animals and ${plantDocs.length} Plants.`);
    process.exit(0);

  } catch (err) {
    console.error("FATAL ERROR", err);
    process.exit(1);
  }
};

seedDatabase();
