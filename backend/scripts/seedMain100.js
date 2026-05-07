const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Species = require("../models/Species");

const rawList = [
  // ── Mammals (30) ──
  ["Bengal Tiger", "Panthera tigris tigris", "Mammal", "Gangetic Plain", "Forest", "Endangered"],
  ["Indian Elephant", "Elephas maximus indicus", "Mammal", "Western Ghats", "Forest", "Endangered"],
  ["Snow Leopard", "Panthera uncia", "Mammal", "Himalayan", "Mountain", "Vulnerable"],
  ["Asiatic Lion", "Panthera leo persica", "Mammal", "Desert", "Dry Forest", "Endangered"],
  ["Red Panda", "Ailurus fulgens", "Mammal", "North-East India", "Mountain", "Endangered"],
  ["Blackbuck", "Antilope cervicapra", "Mammal", "Deccan Plateau", "Grassland", "Safe"],
  ["Nilgai", "Boselaphus tragocamelus", "Mammal", "Gangetic Plain", "Grassland", "Safe"],
  ["Sloth Bear", "Melursus ursinus", "Mammal", "Deccan Plateau", "Forest", "Vulnerable"],
  ["Indian Pangolin", "Manis crassicaudata", "Mammal", "Central India", "Forest", "Endangered"],
  ["Fishing Cat", "Prionailurus viverrinus", "Mammal", "Coastal", "Wetland", "Vulnerable"],
  ["Barasingha", "Rucervus duvaucelii", "Mammal", "Gangetic Plain", "Wetland", "Vulnerable"],
  ["Indian Wolf", "Canis lupus pallipes", "Mammal", "Deccan Plateau", "Grassland", "Endangered"],
  ["Lion-tailed Macaque", "Macaca silenus", "Mammal", "Western Ghats", "Forest", "Endangered"],
  ["Ganges River Dolphin", "Platanista gangetica", "Mammal", "Gangetic Plain", "Freshwater", "Endangered"],
  ["Indian Rhinoceros", "Rhinoceros unicornis", "Mammal", "North-East India", "Grassland", "Vulnerable"],
  ["Gaur", "Bos gaurus", "Mammal", "Western Ghats", "Forest", "Vulnerable"],
  ["Leopard", "Panthera pardus fusca", "Mammal", "Central India", "Forest", "Vulnerable"],
  ["Dhole", "Cuon alpinus", "Mammal", "Western Ghats", "Forest", "Endangered"],
  ["Striped Hyena", "Hyaena hyaena", "Mammal", "Desert", "Desert", "Near Threatened"],
  ["Indian Fox", "Vulpes bengalensis", "Mammal", "Deccan Plateau", "Grassland", "Safe"],
  ["Golden Langur", "Trachypithecus geei", "Mammal", "North-East India", "Forest", "Endangered"],
  ["Nilgiri Tahr", "Nilgiritragus hylocrius", "Mammal", "Western Ghats", "Mountain", "Endangered"],
  ["Asiatic Wild Ass", "Equus hemionus khur", "Mammal", "Desert", "Desert", "Near Threatened"],
  ["Clouded Leopard", "Neofelis nebulosa", "Mammal", "North-East India", "Forest", "Vulnerable"],
  ["Himalayan Brown Bear", "Ursus arctos isabellinus", "Mammal", "Himalayan", "Mountain", "Critically Endangered"],
  ["Sangai", "Rucervus eldii eldii", "Mammal", "North-East India", "Wetland", "Endangered"],
  ["Indian Muntjac", "Muntiacus muntjak", "Mammal", "Central India", "Forest", "Safe"],
  ["Hoolock Gibbon", "Hoolock hoolock", "Mammal", "North-East India", "Forest", "Endangered"],
  ["Caracal", "Caracal caracal", "Mammal", "Desert", "Scrubland", "Endangered"],
  ["Indian Crested Porcupine", "Hystrix indica", "Mammal", "Deccan Plateau", "Forest", "Safe"],

  // ── Birds (25) ──
  ["Indian Peafowl", "Pavo cristatus", "Bird", "Central India", "Grassland", "Safe"],
  ["Himalayan Monal", "Lophophorus impejanus", "Bird", "Himalayan", "Mountain", "Safe"],
  ["Great Indian Bustard", "Ardeotis nigriceps", "Bird", "Desert", "Grassland", "Critically Endangered"],
  ["Indian Vulture", "Gyps indicus", "Bird", "Central India", "Forest", "Critically Endangered"],
  ["Sarus Crane", "Antigone antigone", "Bird", "Gangetic Plain", "Wetland", "Vulnerable"],
  ["Malabar Hornbill", "Anthracoceros coronatus", "Bird", "Western Ghats", "Forest", "Near Threatened"],
  ["Nicobar Pigeon", "Caloenas nicobarica", "Bird", "Islands", "Forest", "Near Threatened"],
  ["Rufous-necked Hornbill", "Aceros nipalensis", "Bird", "North-East India", "Forest", "Vulnerable"],
  ["Jerdon's Courser", "Rhinoptilus bitorquatus", "Bird", "Deccan Plateau", "Scrubland", "Critically Endangered"],
  ["Forest Owlet", "Athene blewitti", "Bird", "Central India", "Forest", "Endangered"],
  ["Spoon-billed Sandpiper", "Calidris pygmaea", "Bird", "Coastal", "Wetland", "Critically Endangered"],
  ["Bengal Florican", "Houbaropsis bengalensis", "Bird", "Gangetic Plain", "Grassland", "Critically Endangered"],
  ["Pink-headed Duck", "Rhodonessa caryophyllacea", "Bird", "Gangetic Plain", "Wetland", "Critically Endangered"],
  ["Himalayan Quail", "Ophrysia superciliosa", "Bird", "Himalayan", "Mountain", "Critically Endangered"],
  ["Indian Skimmer", "Rynchops albicollis", "Bird", "Gangetic Plain", "Freshwater", "Vulnerable"],
  ["Narcondam Hornbill", "Rhyticeros narcondami", "Bird", "Islands", "Forest", "Endangered"],
  ["Nicobar Megapode", "Megapodius nicobariensis", "Bird", "Islands", "Forest", "Vulnerable"],
  ["Greater Flamingo", "Phoenicopterus roseus", "Bird", "Coastal", "Wetland", "Safe"],
  ["Amur Falcon", "Falco amurensis", "Bird", "North-East India", "Forest", "Safe"],
  ["Indian Roller", "Coracias benghalensis", "Bird", "Central India", "Forest", "Safe"],
  ["Green Imperial Pigeon", "Ducula aenea", "Bird", "Western Ghats", "Forest", "Safe"],
  ["Blood Pheasant", "Ithaginis cruentus", "Bird", "Himalayan", "Mountain", "Safe"],
  ["Fire-tailed Myzornis", "Myzornis pyrrhoura", "Bird", "North-East India", "Mountain", "Safe"],
  ["Painted Stork", "Mycteria leucocephala", "Bird", "Gangetic Plain", "Wetland", "Near Threatened"],
  ["Brahminy Kite", "Haliastur indus", "Bird", "Coastal", "Coastal", "Safe"],

  // ── Reptiles (20) ──
  ["King Cobra", "Ophiophagus hannah", "Reptile", "Western Ghats", "Forest", "Vulnerable"],
  ["Indian Cobra", "Naja naja", "Reptile", "Deccan Plateau", "Grassland", "Safe"],
  ["Gharial", "Gavialis gangeticus", "Reptile", "Gangetic Plain", "Freshwater", "Critically Endangered"],
  ["Mugger Crocodile", "Crocodylus palustris", "Reptile", "Central India", "Freshwater", "Vulnerable"],
  ["Saltwater Crocodile", "Crocodylus porosus", "Reptile", "Islands", "Mangrove", "Safe"],
  ["Indian Python", "Python molurus", "Reptile", "Western Ghats", "Forest", "Near Threatened"],
  ["Reticulated Python", "Malayopython reticulatus", "Reptile", "Islands", "Forest", "Safe"],
  ["Russell's Viper", "Daboia russelii", "Reptile", "Central India", "Grassland", "Safe"],
  ["Common Krait", "Bungarus caeruleus", "Reptile", "Deccan Plateau", "Forest", "Safe"],
  ["Indian Star Tortoise", "Geochelone elegans", "Reptile", "Deccan Plateau", "Scrubland", "Vulnerable"],
  ["Olive Ridley Turtle", "Lepidochelys olivacea", "Reptile", "Coastal", "Marine", "Vulnerable"],
  ["Leatherback Turtle", "Dermochelys coriacea", "Reptile", "Islands", "Marine", "Vulnerable"],
  ["Hawksbill Turtle", "Eretmochelys imbricata", "Reptile", "Islands", "Marine", "Critically Endangered"],
  ["Green Sea Turtle", "Chelonia mydas", "Reptile", "Coastal", "Marine", "Endangered"],
  ["Bengal Monitor", "Varanus bengalensis", "Reptile", "Central India", "Forest", "Safe"],
  ["Water Monitor", "Varanus salvator", "Reptile", "Coastal", "Mangrove", "Safe"],
  ["Banded Krait", "Bungarus fasciatus", "Reptile", "North-East India", "Forest", "Safe"],
  ["Bamboo Pit Viper", "Trimeresurus gramineus", "Reptile", "Western Ghats", "Forest", "Safe"],
  ["Cane Turtle", "Vijayachelys silvatica", "Reptile", "Western Ghats", "Forest", "Endangered"],
  ["Indian Flapshell Turtle", "Lissemys punctata", "Reptile", "Gangetic Plain", "Freshwater", "Safe"],

  // ── Amphibians (10) ──
  ["Purple Frog", "Nasikabatrachus sahyadrensis", "Amphibian", "Western Ghats", "Forest", "Endangered"],
  ["Malabar Gliding Frog", "Rhacophorus malabaricus", "Amphibian", "Western Ghats", "Forest", "Safe"],
  ["Himalayan Salamander", "Tylototriton verrucosus", "Amphibian", "Himalayan", "Wetland", "Safe"],
  ["Indian Bullfrog", "Hoplobatrachus tigerinus", "Amphibian", "Central India", "Wetland", "Safe"],
  ["Kottigehar Dancing Frog", "Micrixalus kottigeharensis", "Amphibian", "Western Ghats", "Forest", "Critically Endangered"],
  ["Garo Hills Tree Toad", "Pedostibes kempi", "Amphibian", "North-East India", "Forest", "Critically Endangered"],
  ["Anamalai Flying Frog", "Rhacophorus pseudomalabaricus", "Amphibian", "Western Ghats", "Forest", "Critically Endangered"],
  ["Chalazodes Bubble-nest Frog", "Raorchestes chalazodes", "Amphibian", "Western Ghats", "Forest", "Critically Endangered"],
  ["Resplendent Shrub Frog", "Raorchestes resplendens", "Amphibian", "Western Ghats", "Mountain", "Critically Endangered"],
  ["Toad-skinned Frog", "Clinotarsus curtipes", "Amphibian", "Western Ghats", "Forest", "Near Threatened"],

  // ── Fish & Marine (15) ──
  ["Whale Shark", "Rhincodon typus", "Fish", "Coastal", "Marine", "Endangered"],
  ["Humphead Wrasse", "Cheilinus undulatus", "Fish", "Islands", "Marine", "Endangered"],
  ["Golden Mahseer", "Tor putitora", "Fish", "Himalayan", "Freshwater", "Endangered"],
  ["Deccan Mahseer", "Tor khudree", "Fish", "Deccan Plateau", "Freshwater", "Endangered"],
  ["Hilsa", "Tenualosa ilisha", "Fish", "Coastal", "Freshwater", "Safe"],
  ["Ganges Shark", "Glyphis gangeticus", "Fish", "Gangetic Plain", "Freshwater", "Critically Endangered"],
  ["Pondicherry Shark", "Carcharhinus hemiodon", "Fish", "Coastal", "Marine", "Critically Endangered"],
  ["Sawfish", "Pristidae", "Fish", "Coastal", "Marine", "Critically Endangered"],
  ["Giant Manta Ray", "Mobula birostris", "Fish", "Islands", "Marine", "Endangered"],
  ["Red Lined Torpedo Barb", "Sahyadria denisonii", "Fish", "Western Ghats", "Freshwater", "Endangered"],
  ["Dugong", "Dugong dugon", "Mammal", "Coastal", "Marine", "Vulnerable"], // Categorized aquatic as Fish/Marine for ease, but scientifically Mammal.
  ["Finless Porpoise", "Neophocaena phocaenoides", "Mammal", "Coastal", "Marine", "Vulnerable"],
  ["Irrawaddy Dolphin", "Orcaella brevirostris", "Mammal", "Coastal", "Marine", "Endangered"],
  ["Sperm Whale", "Physeter macrocephalus", "Mammal", "Islands", "Marine", "Vulnerable"],
  ["Blue Whale", "Balaenoptera musculus", "Mammal", "Islands", "Marine", "Endangered"]
];

const ecosystemPopulations = {
  "Safe": 50000,
  "Near Threatened": 12000,
  "Vulnerable": 4000,
  "Endangered": 1500,
  "Critically Endangered": 200,
};

const speciesObjects = rawList.map((row) => ({
  name: row[0],
  scientificName: row[1],
  type: row[2] === "Mammal" && row[4] === "Marine" ? "Other" : row[2], // Map aquatic mammals properly or keep as Mammal
  zone: row[3],
  ecosystem: row[4],
  conservationStatus: row[5],
  population: ecosystemPopulations[row[5]] + Math.floor(Math.random() * 500),
  habitatLoss: Math.floor(Math.random() * 60) + 20,
  pollutionLevel: Math.floor(Math.random() * 50) + 10,
  climateRisk: Math.floor(Math.random() * 50) + 20,
  description: `The ${row[0]} (${row[1]}) is a remarkable ${row[2].toLowerCase()} native to the ${row[3]} region. Highly adapted to its ${row[4].toLowerCase()} ecosystem, it plays a critical role in the local food web. Its current conservation status is ${row[5]}.`,
  habitat: `Found primarily in the ${row[4].toLowerCase()} environments of the ${row[3]}.`,
  threats: ["Habitat destruction", "Human-wildlife conflict", "Climate change", "Pollution"],
  funFacts: [
    `The ${row[0]} is known for its incredible adaptations to the ${row[4].toLowerCase()}`,
    `Unlike many other species, they thrive in the ${row[3]} zone but are highly sensitive to environmental changes.`
  ],
  imageUrl: "", // We are removing all DB image URLs so local fallback triggers
  images: [],
}));

const seed100 = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");
    
    await Species.deleteMany();
    console.log("Cleared existing database.");

    const result = await Species.insertMany(speciesObjects);
    console.log(`✅ Successfully seeded ${result.length} native Indian species!`);

    process.exit(0);
  } catch (e) {
    console.error("Error setting up DB:", e);
    process.exit(1);
  }
}

seed100();
