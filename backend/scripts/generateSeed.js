// ============================================================
// SEED DATA GENERATOR - Creates 500 animals + 500 plants
// Run: node scripts/generateSeed.js
// ============================================================

const fs = require('fs');

const ZONES = [
  { zoneName: "Himalayan", statesCovered: ["Jammu & Kashmir", "Himachal Pradesh", "Uttarakhand", "Sikkim", "Arunachal Pradesh"], description: "Mountain ranges of the Himalayas with diverse alpine and temperate flora and fauna", ecosystems: ["Alpine Meadow", "Coniferous Forest", "Tundra"], area: 553000 },
  { zoneName: "Western Ghats", statesCovered: ["Gujarat", "Maharashtra", "Goa", "Karnataka", "Kerala", "Tamil Nadu"], description: "UNESCO World Heritage site with tropical evergreen and deciduous forests", ecosystems: ["Tropical Rainforest", "Deciduous Forest", "Shola"], area: 140000 },
  { zoneName: "Eastern Ghats", statesCovered: ["Odisha", "Andhra Pradesh", "Telangana", "Tamil Nadu"], description: "Discontinuous mountain ranges along India's eastern coast", ecosystems: ["Deciduous Forest", "Dry Forest", "Grassland"], area: 75000 },
  { zoneName: "Indo-Gangetic Plain", statesCovered: ["Punjab", "Haryana", "Uttar Pradesh", "Bihar", "West Bengal"], description: "Fertile alluvial plains formed by the Indus and Ganges river systems", ecosystems: ["Grassland", "Wetland", "Agricultural"], area: 700000 },
  { zoneName: "Thar Desert", statesCovered: ["Rajasthan", "Gujarat", "Haryana", "Punjab"], description: "Arid region in northwestern India with extreme temperature variations", ecosystems: ["Desert", "Sand Dunes", "Salt Marsh"], area: 320000 },
  { zoneName: "Deccan Plateau", statesCovered: ["Maharashtra", "Madhya Pradesh", "Chhattisgarh", "Karnataka", "Telangana", "Andhra Pradesh"], description: "Large interior plateau with varied vegetation and wildlife", ecosystems: ["Dry Deciduous Forest", "Scrubland", "Grassland"], area: 1600000 },
  { zoneName: "Coastal", statesCovered: ["Gujarat", "Maharashtra", "Goa", "Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Odisha", "West Bengal"], description: "Extensive coastline along the Arabian Sea and Bay of Bengal", ecosystems: ["Mangrove", "Coral Reef", "Mudflat", "Beach"], area: 300000 },
  { zoneName: "Islands", statesCovered: ["Andaman & Nicobar", "Lakshadweep"], description: "Indian archipelago with unique endemic species", ecosystems: ["Tropical Rainforest", "Mangrove", "Coral Reef"], area: 8300 },
  { zoneName: "North-East India", statesCovered: ["Assam", "Meghalaya", "Nagaland", "Manipur", "Mizoram", "Tripura", "Arunachal Pradesh"], description: "Biodiversity hotspot with dense forests and rare wildlife", ecosystems: ["Tropical Rainforest", "Sub-Tropical Forest", "Wetland"], area: 262000 },
];

const ECOSYSTEMS = [
  { name: "Tropical Rainforest", description: "Dense evergreen forests with high rainfall year-round", zone: "Western Ghats", majorThreats: ["Deforestation", "Habitat Fragmentation"], area: 30000 },
  { name: "Tropical Forest", description: "Lush forests with diverse species composition", zone: "Western Ghats", majorThreats: ["Deforestation", "Poaching"], area: 40000 },
  { name: "Deciduous Forest", description: "Forests that shed leaves during dry season", zone: "Central India", majorThreats: ["Logging", "Agriculture"], area: 80000 },
  { name: "Dry Deciduous Forest", description: "Semi-arid forests with drought-resistant species", zone: "Deccan Plateau", majorThreats: ["Overgrazing", "Fire"], area: 100000 },
  { name: "Alpine Meadow", description: "High-altitude grasslands above the tree line", zone: "Himalayan", majorThreats: ["Climate Change", "Livestock Grazing"], area: 50000 },
  { name: "Coniferous Forest", description: "High altitude forests dominated by conifers", zone: "Himalayan", majorThreats: ["Logging", "Climate Change"], area: 45000 },
  { name: "Grassland", description: "Open grassy plains with scattered trees", zone: "Indo-Gangetic Plain", majorThreats: ["Agricultural Expansion", "Invasive Species"], area: 150000 },
  { name: "Wetland", description: "Water-saturated areas supporting aquatic biodiversity", zone: "Indo-Gangetic Plain", majorThreats: ["Water Pollution", "Draining"], area: 70000 },
  { name: "Desert", description: "Arid regions with sparse vegetation and extreme temperatures", zone: "Thar Desert", majorThreats: ["Desertification", "Water Scarcity"], area: 320000 },
  { name: "Mangrove", description: "Coastal forests tolerant of salt water", zone: "Coastal", majorThreats: ["Coastal Development", "Sea Level Rise"], area: 7000 },
  { name: "Coral Reef", description: "Underwater ecosystems supporting marine life", zone: "Islands", majorThreats: ["Coral Bleaching", "Pollution"], area: 2400 },
  { name: "Shola", description: "Montane evergreen forests in the Western Ghats", zone: "Western Ghats", majorThreats: ["Fragmentation", "Climate Change"], area: 10000 },
  { name: "Scrubland", description: "Open shrub-dominated vegetation", zone: "Deccan Plateau", majorThreats: ["Overgrazing", "Fire"], area: 60000 },
  { name: "Sub-Tropical Forest", description: "Dense subtropical forests in northeast India", zone: "North-East India", majorThreats: ["Shifting Cultivation", "Logging"], area: 55000 },
  { name: "Sand Dunes", description: "Wind-formed sandy landforms in arid regions", zone: "Thar Desert", majorThreats: ["Desertification", "Mining"], area: 85000 },
];

function img(name) {
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/${name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg/1280px-${name.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
}

const zones = ["Himalayan", "Western Ghats", "Eastern Ghats", "Indo-Gangetic Plain", "Thar Desert", "Deccan Plateau", "Coastal", "Islands", "North-East India"];
const ecosystems = ["Tropical Rainforest", "Tropical Forest", "Deciduous Forest", "Dry Deciduous Forest", "Alpine Meadow", "Coniferous Forest", "Grassland", "Wetland", "Desert", "Mangrove", "Coral Reef", "Shola", "Scrubland", "Sub-Tropical Forest", "Sand Dunes"];
const statuses = ["Safe", "Near Threatened", "Vulnerable", "Endangered", "Critically Endangered"];

// Generate 500 animals
const ANIMALS = [];
const animalTypes = ["Mammal", "Bird", "Reptile", "Amphibian", "Fish", "Insect"];

const animalNames = [
  "Bengal Tiger", "Indian Elephant", "Snow Leopard", "Indian Rhinoceros", "Asiatic Lion", "Red Panda", "Gaur", "Sambar Deer", "Chital", "Lion-tailed Macaque",
  "Hoolock Gibbon", "Blackbuck", "Fishing Cat", "Malabar Giant Squirrel", "Indian Pangolin", "Smooth-coated Otter", "Gharial", "Nilgai", "Wild Water Buffalo", "Swamp Deer",
  "Indian Wild Boar", "Golden Jackal", "Striped Hyena", "Binturong", "Dhole", "Sloth Bear", "Leopard", "Clouded Leopard", "Indian Grey Wolf", "Himalayan Brown Bear",
  "Kashmir Stag", "Pygmy Hog", "Hispid Hare", "Indian Wild Ass", "Tibetan Antelope", "Himalayan Tahr", "Markhor", "Yak", "Jungle Cat", "Rusty-spotted Cat",
  "Caracal", "Leopard Cat", "Asian Small-clawed Otter", "Indian Giant Flying Squirrel", "Porcupine", "Indian Hare", "Mongoose", "Palm Civet", "Himalayan Musk Deer", "Four-horned Antelope",
  "Indian Star Tortoise", "Olive Ridley Sea Turtle", "King Cobra", "Mugger Crocodile", "Indian Python", "Russell's Viper", "Indian Krait", "Indian Monitor Lizard", "Saltwater Crocodile", "Common Krait",
  "Indian Peafowl", "Great Indian Bustard", "Sarus Crane", "White-rumped Vulture", "Peregrine Falcon", "Indian Eagle-Owl", "Indian Grey Hornbill", "Great Hornbill", "Asian Koel", "Indian Skimmer",
  "Lesser Florican", "Nicobar Megapode", "Andaman Teal", "White-bellied Heron", "Bengal Florican", "Painted Stork", "Asian Openbill", "Black-headed Ibis", "Spoonbill", "Greater Flamingo",
  "Lesser Flamingo", "Demoiselle Crane", "Siberian Crane", "Black-necked Crane", "Cheer Pheasant", "Monal", "Kalij Pheasant", "Red Junglefowl", "Grey Junglefowl", "Little Grebe",
  "Great Crested Grebe", "Spot-billed Pelican", "Dalmatian Pelican", "Little Cormorant", "Great Cormorant", "Indian Darter", "Little Egret", "Great Egret", "Median Egret", "Cattle Egret",
  "Indian Pond Heron", "Chestnut-bellied Sandgrouse", "Spotted Dove", "Red Collared Dove", "Eurasian Collared Dove", "Oriental Turtle Dove", "Yellow-footed Green Pigeon", "Indian Bullfrog", "Common Indian Toad", "Tree Frog",
  "Malabar Tree Frog", "Golden Tree Frog", "Asian Toad", "Indian Skipper Frog", "Skittering Frog", "Five-stripped Frog", "Cascade Frog", "Torrent Frog", "High Altitude Frog", "Burrowing Frog",
  "Indian Pond Frog", "Bronze Frog", "Tiger Frog", "Red-vented Bulbul Tadpole", "Ornate Microhylid", "Boulenger's Glandular Frog", "Wynad Hills Frog", "Kashmir Valley Frog", "Himalayan Newt", "South Indian Cricket Frog",
  "Kera Tree Frog", "Indian Major Carp", "Rohu", "Mrigal", "Catla", "Golden Mahseer", "Deccan Mahseer", "Indian Trout", "Snow Trout", "Mud Spiny Eel",
  "Indian Mackerel", "Oil Sardine", "Hilsa Shad", "Indian Salmon", "Giant Freshwater Prawn", "Indian Prawn", "Indian Eel", "Butterfish", "Pearl Spot", "Green Chromide",
  "Giant Danio", "Zebra Danio", "Rosy Barb", "Tiger Barb", "Climbing Bass", "Walking Catfish", "Stinging Catfish", "Electric Catfish", "Butterfly Fish", "Glass Fish",
  "Atlas Moth", "Indian Moon Moth", "Common Jezebel", "Plain Tiger", "Blue Mormon", "Common Sergeant", "Common Four-Ring", "Giant Wood Spider", "Indian Tree Ant", "Weaver Ant",
  "Dragonfly", "Damselfly", "Indian Honey Bee", "Giant Honey Bee", "Digger Bee", "Indian Stick Insect", "Leaf Insect", "Atlas Beetle", "Rhinoceros Beetle", "Firefly",
  "Common Grasshopper", "Sacred Beetle", "Indian Termite", "Butterfly", "Moth", "Cicada", "Preying Mantis", "Scorpion", "Tarantula", "Indian Cockroach",
  "Centipede", "Rhesus Macaque", "Assamese Macaque", "Capped Langur", "Golden Langur", "Nicobar Tree Shrew", "Indian Flying Fox", "Short-nosed Fruit Bat", "Kashmir Gerbil", "Five-striped Palm Squirrel",
  "Western Ghats Giant Squirrel", "Dusky Striped Squirrel", "Malabar Spiny Mouse", "Indian Bush Rat", "Small Indian Civet", "Toddy Cat", "Banded Mongoose", "Striped-necked Mongoose", "Yellow-throated Marten", "Bengal Fox",
  "Tibetan Fox", "Honey Badger", "Eurasian Otter", "Marbled Cat", "Small Indian Mongoose", "Ruddy Mongoose", "Crab-eating Mongoose", "Eurasian Lynx", "Wild Pig", "Barking Deer",
  "Mouse Deer", "Indian Chevrotain", "Sambar", "Barking Deer", "Goral", "Serow", "Takin", "Wild Buffalo", "Wild Sheep", "Bharal", "Ibex",
  "Blue Sheep", "Urial", "Chinkara", "Blackbuck", "Chinkara", "Goa", "Gaur", "Goral", "Serow", "Takin",
  "Musk Shrew", "House Shrew", "Etruscan Shrew", "Indian Gerbil", "Jungle Striped Squirrel", "Smooth-coated Otter", "Fishing Cat", "Leopard Cat", "Marbled Cat", "Asian Small-clawed Otter",
  "Small Indian Mongoose", "Ruddy Mongoose", "Crab-eating Mongoose", "Eurasian Lynx", "Wild Pig", "Barking Deer", "Mouse Deer", "Indian Chevrotain", "Sambar", "Barking Deer",
  "Goral", "Serow", "Takin", "Wild Buffalo", "Wild Sheep", "Bharal", "Ibex", "Blue Sheep", "Urial", "Chinkara",
  "Musk Shrew", "House Shrew", "Etruscan Shrew", "Indian Gerbil", "Jungle Striped Squirrel", "Marbled Cat", "Eurasian Lynx", "Goral", "Serow", "Takin",
  "Small Indian Mongoose", "Ruddy Mongoose", "Crab-eating Mongoose", "Wild Pig", "Barking Deer", "Mouse Deer", "Indian Chevrotain", "Sambar", "Bharal", "Ibex",
  "Blue Sheep", "Urial", "Chinkara", "Musk Shrew", "House Shrew", "Etruscan Shrew", "Smooth-coated Otter", "Fishing Cat", "Leopard Cat", "Asian Small-clawed Otter",
  "Yellow-throated Marten", "Bengal Fox", "Tibetan Fox", "Honey Badger", "Eurasian Otter", "Marbled Cat", "Small Indian Mongoose", "Ruddy Mongoose", "Crab-eating Mongoose", "Eurasian Lynx",
  "Goral", "Serow", "Takin", "Wild Buffalo", "Wild Sheep", "Bharal", "Ibex", "Blue Sheep", "Urial", "Chinkara",
  "Musk Shrew", "House Shrew", "Smooth-coated Otter", "Fishing Cat", "Leopard Cat", "Asian Small-clawed Otter", "Yellow-throated Marten", "Bengal Fox", "Tibetan Fox", "Honey Badger",
  "Eurasian Otter", "Marbled Cat", "Small Indian Mongoose", "Ruddy Mongoose", "Crab-eating Mongoose", "Eurasian Lynx", "Wild Pig", "Barking Deer", "Mouse Deer", "Indian Chevrotain",
  "Sambar", "Bharal", "Ibex", "Blue Sheep", "Urial", "Chinkara", "House Shrew", "Etruscan Shrew", "Smooth-coated Otter", "Fishing Cat",
  "Leopard Cat", "Asian Small-clawed Otter", "Yellow-throated Marten", "Bengal Fox", "Tibetan Fox", "Honey Badger", "Eurasian Otter", "Marbled Cat", "Small Indian Mongoose", "Ruddy Mongoose",
  "Crab-eating Mongoose", "Eurasian Lynx", "Wild Pig", "Barking Deer", "Mouse Deer", "Indian Chevrotain", "Sambar", "Bharal", "Ibex", "Blue Sheep",
  "Urial", "Chinkara", "Musk Shrew", "House Shrew", "Etruscan Shrew", "Smooth-coated Otter", "Fishing Cat", "Leopard Cat", "Asian Small-clawed Otter", "Yellow-throated Marten",
  "Bengal Fox", "Tibetan Fox", "Honey Badger", "Eurasian Otter", "Marbled Cat", "Small Indian Mongoose", "Ruddy Mongoose", "Crab-eating Mongoose", "Eurasian Lynx", "Wild Pig",
  "Barking Deer", "Mouse Deer", "Indian Chevrotain", "Sambar", "Bharal", "Ibex", "Blue Sheep", "Urial", "Chinkara", "House Shrew",
  "Etruscan Shrew", "Smooth-coated Otter", "Fishing Cat", "Leopard Cat", "Asian Small-clawed Otter", "Yellow-throated Marten", "Bengal Fox", "Tibetan Fox", "Honey Badger", "Eurasian Otter"
];

const animalScientific = [
  "Panthera tigris tigris", "Elephas maximus indicus", "Panthera uncia", "Rhinoceros unicornis", "Panthera leo persica", "Ailurus fulgens", "Bos gaurus", "Rusa unicolor", "Axis axis", "Macaca silenus",
  "Hoolock hoolock", "Antilope cervicapra", "Prionailurus viverrinus", "Ratufa indica", "Manis crassicaudata", "Lutrogale perspicillata", "Gavialis gangeticus", "Boselaphus tragocamelus", "Bubalus arnee", "Rucervus duvaucelii",
  "Sus scrofa", "Canis aureus", "Hyaena hyaena", "Arctictis binturong", "Cuon alpinus", "Melursus ursinus", "Panthera pardus", "Neofelis nebulosa", "Canis lupus pallipes", "Ursus arctos isabellinus",
  "Cervus elaphus hanglu", "Porcula salvania", "Caprolagus hispidus", "Equus hemionus khur", "Pantholops hodgsonii", "Hemitragus jemlahicus", "Capra falconeri", "Bos grunniens", "Felis chaus", "Prionailurus rubiginosus",
  "Caracal caracal", "Prionailurus bengalensis", "Aonyx cinereus", "Petaurista philippensis", "Hystrix indica", "Lepus nigricollis", "Herpestes edwardsii", "Paradoxurus hermaphroditus", "Moschus leucogaster", "Tetracerus quadricornis",
  "Geochelone elegans", "Lepidochelys olivacea", "Ophiophagus hannah", "Crocodylus palustris", "Python bivittatus", "Daboia russelii", "Bungarus caeruleus", "Varanus bengalensis", "Crocodylus porosus", "Bungarus fasciatus",
  "Pavo cristatus", "Ardeotis nigriceps", "Antigone antigone", "Gyps bengalensis", "Falco peregrinus", "Bubo bengalensis", "Ocyceros birostris", "Buceros bicornis", "Eudynamys scolopaceus", "Rynchops albicollis",
  "Sitalina gutturalis", "Megapodius nicobariensis", "Anzi anas", "Ardea insignis", "Sitalina bengalensis", "Mycteria leucocephala", "Anastomus oscitans", "Threskiornis melanocephalus", "Platalea leucorodia", "Phoenicopterus roseus",
  "Phoenicopterus minor", "Anthropoides virgo", "Grus leucogeranus", "Grus nigricollis", "Catreus wallichii", "Lophophorus impejanus", "Lophura leucomelanos", "Gallus gallus", "Gallus sonneratii", "Tachybaptus ruficollis",
  "Podiceps cristatus", "Pelecanus philippensis", "Pelecanus crispus", "Microcarbo niger", "Phalacrocorax carbo", "Anhinga melanogaster", "Egretta garzetta", "Casmerodius albus", "Mesophoyx intermedia", "Bubulcus ibis",
  "Ardeola grayii", "Pterocles exustus", "Spilopelia chinensis", "Streptopelia tranquebarica", "Streptopelia decaocto", "Streptopelia orientalis", "Treron phoenicoptera", "Hoplobatrachus tigerinus", "Duttaphrynus melanostictus", "Polypedates maculatus",
  "Beddomixalus rhodops", "Polypedates himalayensis", "Duttaphrynus stomaticus", "Euphlyctis cyanophlyctis", "Euphlyctis kalachakra", "Paa arnoldi", "Amolops formosus", "Amolops himalayensis", "Paa fragilis", "Sphaerotheca rolandae",
  "Euphlyctis esculenta", "Hoplobatrachus crassus", "Hoplobatrachus tigerinus", "Microhyla rubra", "Microhyla ornata", "Nasutixys jerdoni", "Micrixalus nilagiricus", "Paa ch subjectus", "Tylototriton verrucosus", "Fejervarya graniosa",
  "Kassinula pressulos", "Catla catla", "Labeo rohita", "Cirrhinus mrigala", "Labeo catla", "Tor putitora", "Tor khudree", "Schizothorax plagiostomus", "Schizothorax richardsonii", "Mastacembelus armatus",
  "Rastrelliger kanagurta", "Sardinella longiceps", "Tenualosa ilisha", "Eleutheronema tetradactylum", "Macrobrachium rosenbergii", "Fenneropenaeus indicus", "Anguilla bengalensis", "Pseudupeneus moluccensis", "Etroplus suratensis", "Etroplus viridatus",
  "Devario aequipinnatus", "Danio rerio", "Hemigrammus erythrozonus", "Pethia conchonius", "Puntigrus tetrazona", "Anabas testudineus", "Clarias batrachus", "Heteropneustes fossilis", "Malapterurus electricus", "Pantodon buchholzi",
  "Chanda ranga", "Attacus atlas", "Actias selene", "Delias eucharis", "Danaus chrysippus", "Papilio polymnestor", "Athyma selenophora", "Ypthima ceylonica", "Nephila pilipes", "Oecophylla smaragdina",
  "Oecophylla longinoda", "Anax spp", "Ischnura spp", "Apis cerana", "Apis dorsata", "Anthophora", "Phyllium", "Phyllium", "Chalcosoma atlas", "Oryctes rhinoceros",
  "Luciola spp", "Acrididae", "Scarabaeus", "Odontotermes", "Papilio", "Saturniidae", "Magicicada", "Mantis religiosa", "Heterometrus", "Haplopelma",
  "Periplaneta indica", "Scolopendra", "Macaca mulatta", "Macaca assamensis", "Trachypithecus pileatus", "Trachypithecus geei", "Tupaia nicobarica", "Pteropus giganteus", "Cynopterus sphinx", "Tatera indica",
  "Funambulus pennatus", "Ratufa indica", "Funambulus sublineatus", "Platacanthomys lasiurus", "Golunda ellioti", "Viverricula indica", "Paradoxurus hermaphroditus", "Mungos mungo", "Herpestes vitticollis", "Martes flavigula",
  "Vulpes bengalensis", "Vulpes ferrilata", "Mellivora capensis", "Lutra lutra", "Pardofelis marmorata", "Herpestes auropunctatus", "Herpestes smithii", "Herpestes urva", "Lynx lynx", "Sus scrofa",
  "Muntiacus vaginalis", "Moschiola indica", "Moschiola meminna", "Muntiacus muntjak", "Naemorhedus goral", "Capricornis sumatraensis", "Budorcas taxicolor", "Ovis orientalis", "Pseudois nayaur", "Capra ibex"
];

for (let i = 0; i < 500; i++) {
  const type = animalTypes[i % 6];
  const zone = zones[i % 9];
  const eco = ecosystems[i % 15];
  const status = statuses[Math.floor(i / 100) % 5];
  const habitatLoss = 15 + (i % 60);
  const pollution = 10 + (i % 40);
  const climate = 15 + (i % 50);
  const pop = 500 + (i * 1234) % 500000;

  const name = animalNames[i % animalNames.length] + (i >= animalNames.length ? ` ${Math.floor(i / animalNames.length)}` : '');
  const sciName = animalScientific[i % animalScientific.length] + (i >= animalScientific.length ? ` ${Math.floor(i / animalScientific.length)}` : '');

  ANIMALS.push({
    name,
    scientificName: sciName,
    type,
    zone,
    ecosystem: eco,
    population: pop,
    habitatLoss,
    pollutionLevel: pollution,
    climateRisk: climate,
    conservationStatus: status,
    description: `${name} is a ${status.toLowerCase()} ${type.toLowerCase()} found in ${zone}. Important species for biodiversity conservation.`,
    habitat: `${eco} in ${zone}`,
    threats: ["Habitat Loss", "Climate Change", "Human Conflict"],
    funFacts: [`${name} is native to India`, "Important ecosystem indicator"],
    imageUrl: img(name)
  });
}

// Generate 500 plants
const PLANTS = [];
const plantTypes = ["Tree", "Shrub", "Herb", "Medicinal", "Grass", "Fern", "Climber", "Other"];

const plantNames = [
  "Banyan", "Peepal", "Neem", "Mango", "Tulsi", "Sandalwood", "Teak", "Sal Tree", "Deodar Cedar", "Indian Rosewood",
  "Ashoka Tree", "Amla", "Bael", "Jackfruit", "Jamun", "Mahua", "Palash", "Tamarind", "Gulmohar", "Drumstick Tree",
  "Ashwagandha", "Shatavari", "Aloe Vera", "Turmeric", "Ginger", "Cardamom", "Black Pepper", "Cinnamon", "Clove", "Nutmeg",
  "Vetiver", "Bamboo", "Coconut", "Banana", "Papaya", "Guava", "Pomegranate", "Indian Lotus", "Water Hyacinth", "Wild Jasmine",
  "Indian Oleander", "Sacred Grove", "Red Silk Cotton", "White Silk Cotton", "Kadam", "Kashmir Willow", "Chinar", "Walnut", "Almond", "Apricot",
  "Cherry", "Oak", "Maple", "Birch", "Rhododendron", "Chestnut", "Hollong", "Hollock", "Poma", "Amra",
  "Karonda", "Custard Apple", "Wood Apple", "Sitaphal", "Litchi", "Ber", "Khejri", "Babool", "Jhand", "Suar",
  "Siris", "Sissoo", "Pilkhan", "Chir Pine", "Blue Pine", "Spruce", "Fir", "Cypress", "Juniper", "Morse",
  "Alder", "Malsa", "Tiger Bamboo", "Golden Bamboo", "Malabar", "Pride of India", "Indian Almond", "Cashew", "Oil Palm", "Date Palm",
  "Palmyra", "Toddy Palm", "Sugar Palm", "Moringa", "Curry Leaf", "Babul", "Kher", "Kumat", "Shisham", "Rosewood",
  "Blackwood", "Red Sanders", "White Cedar", "Indian Redwood", "Chittagong Wood", "Box Myrtle", "Kapok", "Simal", "Simbai", "Orange",
  "Lemon", "Lime", "Sweet Lime", "Grapefruit", "Mandarin", "Pummelo", "Coffee", "Tea", "Rubber", "Pepper",
  "Java Pepper", "Indian Lavender", "Patchouli", "Lemongrass", "Citronella", "Palmarosa", "Ginger Grass", "Khus", "Cedar", "Brahmi",
  "Bach", "Punarnava", "Gokharu", "Shankhapushpi", "Guduchi", "Pudina", "Ajwain", "Saunf", "Methi", "Kalajira",
  "Dhania", "Haldi", "Adrak", "Lasun", "Pyaaz", "Amaltas", "Senna", "Kalmegh", "Makoi", "Kantakari",
  "Brihati", "Guggul", "Safed Musli", "Kaunch", "Vidhara", "Shyama", "Dhatura", "Belladonna", "Rauwolfia", "Sarpagandha",
  "Kurchi", "Kutaj", "Chirata", "Bhimseni", "Kutki", "Atees", "K Jadi", "Musli", "Lobelia", "Ephedra",
  "Taxus", "Mishmi Teeta", "Kesar", "Kokum", "Mangosteen", "Rambutan", "Starfruit", "Bilimbi", "Carambola", "Dragon Fruit",
  "Passion Fruit", "Soursop", "Cherimoya", "Loquat", "Persimmon", "Japanese Persimmon", "Olive", "Fig", "Date Palm", "Fish Tail Palm",
  "Gola", "Ice Apple", "Indian Willow", "Giant Reed", "Elephant Grass", "Napier Grass", "Sugarcane", "Kanta Bansa", "Sword Grass", "Munj",
  "Bans", "Fern", "Bird Nest Fern", "Maiden Hair Fern", "Brake Fern", "Lichen", "Moss", "Club Moss", "Horsetail", "Water Fern",
  "Floating Moss", "Duckweed", "Water Lettuce", "Lotus", "Water Lily", "Victoria Amazonica", "Ipomoea", "Beach Vine", "Sea Convolvulus", "Portia Tree",
  "Beach Hibiscus", "Sea Almond", "Pandanus", "Screw Pine", "Casuarina", "Beach Casuarina", "Tournefortia", "Sea Purslane", "Beach Cabbage", "Barringtonia",
  "Calophyllum", "Punnai", "Methanol", "Ceriops", "Rhizophora", "Bruguiera", "Kandelia", "Aegiceras", "Excoecaria", "Suaeda",
  "Glasswort", "Mangrove", "Mangrove", "Mangrove", "Heritiera", "Brown Mallow", "Poconut", "Bay", "Indi", "Jaya",
  "Basmati", "Paddy", "Wheat", "Barley", "Ragi", "Bajra", "Jowar", "Makka", "Indian Mallow", "Hibiscus",
  "Cotton", "Jute", "Sun Hemp", "Sesame", "Mustard", "Groundnut", "Soybean", "Sunflower", "Safflower", "Linseed",
  "Castor", "Palm", "Olive", "Coconut", "Cashew", "Poppy", "Opium Poppy", "Tobacco", "Tea", "Coffee",
  "Rubber", "Pepper", "Cardamom", "Ginger", "Turmeric", "Cinnamon", "Clove", "Nutmeg", "Vanilla", "Cocoa",
  "Tea", "Coffee", "Tobacco", "Sugarcane", "Cotton", "Jute", "Sisal", "Bamboo", "Rattan", "Munj",
  "Sarkanda", "Elephant Grass", "Napier Grass", "Hybrid Napier", "Stylo", "Lucerne", "Berseem", "Oat", "Barley", "Wheat",
  "Rice", "Maize", "Jowar", "Bajra", "Ragi", "Kodnni", "Korra", "Saawan", "Cheena", "Kutki",
  "Kashni", "Methi", "Methi", "Kasuri Methi", "Coriander", "Cumin", "Fennel", "Fenugreek", "Caraway", "Ajwain",
  "Dill", "Aniseed", "Poppy Seed", "Sesame", "Linseed", "Mustard", "Taramira", "Sarson", "Methanol", "Bathua",
  "Palak", "Methi", "Amaranth", "Cheak", "Chowlai", "Lettuce", "Cabbage", "Cauliflower", "Broccoli", "Knol Khol",
  "Carrot", "Radish", "Turnip", "Beetroot", "Potato", "Sweet Potato", "Colocasia", "Arbi", "Yam", "Dioscorea",
  "Ginger", "Turmeric", "Garlic", " Onion", "Shallot", "Leek", "Chive", "Rhubarb", "Celery", "Parsley",
  "Parsnip", "Turnip", "Kohlrabi", "Bok Choy", "Chinese Cabbage", "Swiss Chard", "Spinach", "Lettuce", "Endive", " Chicory",
  "Radichio", "Arugula", "Watercress", "Cabbage", "Brussels Sprouts", "Kale", "Collard Greens", "Mustard Greens", "Turnip Greens", "Swiss Chard"
];

const plantScientific = [
  "Ficus benghalensis", "Ficus religiosa", "Azadirachta indica", "Mangifera indica", "Ocimum tenuiflorum", "Santalum album", "Tectona grandis", "Shorea robusta", "Cedrus deodara", "Dalbergia sissoo",
  "Saraca asoca", "Phyllanthus emblica", "Aegle marmelos", "Artocarpus heterophyllus", "Syzygium cumini", "Madhuca longifolia", "Butea monosperma", "Tamarindus indica", "Delonix regia", "Moringa oleifera",
  "Withania somnifera", "Asparagus racemosus", "Aloe barbadensis", "Curcuma longa", "Zingiber officinale", "Elettaria cardamomum", "Piper nigrum", "Cinnamomum verum", "Syzygium aromaticum", "Myristica fragrans",
  "Chrysopogon zizanioides", "Bambusoideae", "Cocos nucifera", "Musa acuminata", "Carica papaya", "Psidium guajava", "Punica granatum", "Nelumbo nucifera", "Eichhornia crassipes", "Jasminum auriculatum",
  "Nerium indicum", "Boswellia serrata", "Bombax ceiba", "Ceiba pentandra", "Anthocephalus cadamba", "Salix alba", "Platanus orientalis", "Juglans regia", "Prunus dulcis", "Prunus armeniaca",
  "Prunus avium", "Quercus leucotrichophora", "Acer campestre", "Betula utilis", "Rhododendron arboreum", "Castanopsis", "Dipterocarpus macrocarpus", "Terminalia myriocarpa", "Phyllanthus emblica", "Spondias pinnata",
  "Carissa spinarum", "Annona squamosa", "Limonia acidissima", "Annona reticulata", "Litchi chinensis", "Ziziphus mauritiana", "Prosopis cineraria", "Acacia nilotica", "Prosopis juliflora", "Acacia leucophloea",
  "Albizia lebbeck", "Dalbergia sissoo", "Ficus infectoria", "Pinus roxburghii", "Pinus wallichiana", "Picea smithiana", "Abies pindrow", "Cupressus torulosa", "Juniperus communis", "Rhododendron arboreum",
  "Alnus nepalensis", "Themeda triandra", "Bambusa tulda", "Phyllostachys aurea", "Melia azedarach", "Lagerstroemia speciosa", "Terminalia catappa", "Anacardium occidentale", "Elaeis guineensis", "Phoenix dactylifera",
  "Borassus flabellifer", "Borassus flabellifer", "Arenga pinnata", "Moringa oleifera", "Murraya koenigii", "Acacia nilotica", "Acacia Senegal", "Acacia catechu", "Dalbergia sissoo", "Dalbergia latifolia",
  "Dalbergia melanoxylon", "Pterocarpus santalinus", "Dysoxylum binectariferum", "Amoora rohituka", "Chukrasia tabularis", "Myrica esculenta", "Ceiba pentandra", "Bombax malabaricum", "Bombax insigne", "Citrus aurantium",
  "Citrus limon", "Citrus aurantifolia", "Citrus limetta", "Citrus paradisi", "Citrus reticulata", "Citrus maxima", "Coffea arabica", "Camellia sinensis", "Hevea brasiliensis", "Piper nigrum",
  "Piper cubeba", "Pogostemon cablin", "Pogostemon cablin", "Cymbopogon citratus", "Cymbopogon winterianus", "Cymbopogon martinii", "Cymbopogon martinii", "Vetiveria zizanioides", "Cedrus deodara",
  "Bacopa monnieri", "Acorus calamus", "Boerhavia diffusa", "Tribulus terrestris", "Convolvulus pluricaulis", "Tinospora cordifolia", "Azadirachta indica", "Ocimum tenuiflorum", "Mentha piperita", "Trachyspermum ammi",
  "Foeniculum vulgare", "Trigonella foenum-graecum", "Nigella sativa", "Coriandrum sativum", "Curcuma longa", "Zingiber officinale", "Allium sativum", "Allium cepa", "Cassia fistula", "Cassia angustifolia",
  "Andrographis paniculata", "Solanum nigrum", "Solanum xanthocarpum", "Solanum indicum", "Commiphora mukul", "Chlorophytum borivilianum", "Mucuna pruriens", "Argyreia nervosa", "Datura metel", "Datura metel",
  "Atropa belladonna", "Rauvolfia serpentina", "Rauvolfia serpentina", "Holarrhena antidysenterica", "Holarrhena antidysenterica", "Swertia chirata", "Gentiana kuruma", "Picrorhiza kurroa", "Aconitum heterophyllum", "Curculigo orchioides",
  "Chlorophytum borivilianum", "Lobelia nicotianifolia", "Ephedra gerardiana", "Taxus baccata", "Coptis teeta", "Crocus sativus", "Garcinia indica", "Garcinia mangostana", "Nephelium lappaceum", "Averrhoa carambola",
  "Averrhoa bilimbi", "Averrhoa carambola", "Hylocereus undatus", "Passiflora edulis", "Annona muricata", "Annona cherimola", "Eriobotrya japonica", "Diospyros kaki", "Olea europaea", "Ficus carica",
  "Phoenix dactylifera", "Caryota urens", "Borassus flabellifer", "Salix tetrasperma", "Arundo donax", "Pennisetum purpureum", "Pennisetum purpureum", "Saccharum officinarum", "Erianthus ravennae", "Imperata cylindrica",
  "Saccharum munja", "Bambusa arundinacea", "Pteris vittata", "Asplenium nidus", "Adiantum capillus-veneris", "Pteris multifida", "Parmelia", "Bryum", "Selaginella", "Equisetum",
  "Azolla", "Salvinia", "Lemna", "Pistia stratiotes", "Nymphaea", "Victoria amazonica", "Ipomoea pes-caprae", "Ipomoea pes-caprae", "Thespesia populnea", "Talipariti tiliaceum",
  "Terminalia catappa", "Pandanus odoratissimus", "Pandanus tectorius", "Casuarina equisetifolia", "Casuarina litorea", "Heliotropium", "Sesuvium portulacastrum", "Scaevola taccada", "Barringtonia asiatica", "Calophyllum inophyllum",
  "Xylocarpus granatum", "Ceriops tagal", "Rhizophora mucronata", "Bruguiera gymnorrhiza", "Kandelia candel", "Aegiceras corniculatum", "Excoecaria agallocha", "Suaeda maritima", "Salicornia", "Avicennia marina",
  "Sonneratia apetala", "Lumnitzera racemosa", "Heritiera fomes", "Thespesia populnea", "Oryza sativa", "Oryza sativa", "Triticum aestivum", "Hordeum vulgare", "Eleusine coracana", "Pennisetum glaucum",
  "Sorghum bicolor", "Zea mays", "Abelmoschus", "Hibiscus rosa-sinensis", "Gossypium", "Corchorus", "Crotalaria", "Sesamum", "Brassica", "Arachis",
  "Glycine", "Helianthus", "Carthamus", "Linum", "Ricinus", "Elaeis", "Olea", "Anacardium", "Papaver", "Papaver somniferum",
  "Nicotiana", "Camellia", "Coffea", "Hevea", "Piper", "Elettaria", "Zingiber", "Curcuma", "Cinnamomum", "Syzygium",
  "Myristica", "Vanilla", "Theobroma", "Camellia sinensis", "Coffea arabica", "Nicotiana tabacum", "Saccharum officinarum", "Gossypium hirsutum", "Corchorus capsularis", "Agave sisalana"
];

for (let i = 0; i < 500; i++) {
  const type = plantTypes[i % 8];
  const zone = zones[i % 9];
  const eco = ecosystems[i % 15];
  const status = statuses[Math.floor(i / 125) % 5];

  const name = plantNames[i % plantNames.length] + (i >= plantNames.length ? ` ${Math.floor(i / plantNames.length)}` : '');
  const sciName = plantScientific[i % plantScientific.length] + (i >= plantScientific.length ? ` ${Math.floor(i / plantScientific.length)}` : '');

  PLANTS.push({
    name,
    scientificName: sciName,
    type,
    zone,
    ecosystem: eco,
    conservationStatus: status,
    description: `${name} is a ${status.toLowerCase()} ${type.toLowerCase()} found in ${zone}. Important species for ecosystem and traditional uses.`,
    habitat: `${eco} in ${zone}`,
    uses: ["Medicinal", "Food", "Timber"],
    funFacts: [`${name} is native to India`, "Important for biodiversity"],
    imageUrl: img(name)
  });
}

console.log('Generated ANIMALS:', ANIMALS.length);
console.log('Generated PLANTS:', PLANTS.length);
console.log('Total:', ANIMALS.length + PLANTS.length);

// Write to seedData.js
const seedContent = `const ZONES = ${JSON.stringify(ZONES, null, 2)};

const ECOSYSTEMS = ${JSON.stringify(ECOSYSTEMS, null, 2)};

const ANIMALS = ${JSON.stringify(ANIMALS, null, 2)};

const PLANTS = ${JSON.stringify(PLANTS, null, 2)};

module.exports = { ZONES, ECOSYSTEMS, ANIMALS, PLANTS };
`;

fs.writeFileSync('./scripts/seedData.js', seedContent);
console.log('\nWritten to scripts/seedData.js');

// Also seed the database directly
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('\nConnected to MongoDB, seeding database...');

  const Species = require('./models/Species');
  const Plant = require('./models/Plant');
  const Zone = require('./models/Zone');
  const Ecosystem = require('./models/Ecosystem');

  // Clear existing data
  await Species.deleteMany({});
  await Plant.deleteMany({});
  await Zone.deleteMany({});
  await Ecosystem.deleteMany({});
  console.log('Cleared existing data');

  // Insert new data
  await Zone.insertMany(ZONES);
  await Ecosystem.insertMany(ECOSYSTEMS);
  await Species.insertMany(ANIMALS);
  await Plant.insertMany(PLANTS);

  console.log(`\n✅ Seeded:`);
  console.log(`   Zones: ${ZONES.length}`);
  console.log(`   Ecosystems: ${ECOSYSTEMS.length}`);
  console.log(`   Animals: ${ANIMALS.length}`);
  console.log(`   Plants: ${PLANTS.length}`);
  console.log(`   TOTAL: ${ANIMALS.length + PLANTS.length} species`);

  await mongoose.disconnect();
  console.log('\nDone!');
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});