const mongoose = require("mongoose");
require("dotenv").config();
const Plant = require("../models/Plant");

const rawList = [
  // ── Trees (35) ──
  ["Banyan Tree", "Ficus benghalensis", "Tree", "Gangetic Plain", "Forest", "Safe"],
  ["Peepal Tree", "Ficus religiosa", "Tree", "Central India", "Forest", "Safe"],
  ["Neem Tree", "Azadirachta indica", "Tree", "Deccan Plateau", "Forest", "Safe"],
  ["Sandalwood", "Santalum album", "Tree", "Western Ghats", "Forest", "Vulnerable"],
  ["Teak", "Tectona grandis", "Tree", "Central India", "Forest", "Safe"],
  ["Sal Tree", "Shorea robusta", "Tree", "Himalayan", "Forest", "Safe"],
  ["Asoka Tree", "Saraca asoca", "Tree", "Western Ghats", "Forest", "Vulnerable"],
  ["Indian Rosewood", "Dalbergia latifolia", "Tree", "Deccan Plateau", "Forest", "Vulnerable"],
  ["Mango Tree", "Mangifera indica", "Tree", "Gangetic Plain", "Forest", "Safe"],
  ["Jackfruit Tree", "Artocarpus heterophyllus", "Tree", "Western Ghats", "Forest", "Safe"],
  ["Gulmohar", "Delonix regia", "Tree", "Central India", "Forest", "Safe"],
  ["Jamun Tree", "Syzygium cumini", "Tree", "Gangetic Plain", "Wetland", "Safe"],
  ["Indian Mahogany", "Toona ciliata", "Tree", "North-East India", "Forest", "Safe"],
  ["Arjuna Tree", "Terminalia arjuna", "Tree", "Central India", "Riverine", "Safe"],
  ["Amaltas", "Cassia fistula", "Tree", "Deccan Plateau", "Forest", "Safe"],
  ["Red Sandalwood", "Pterocarpus santalinus", "Tree", "Eastern Ghats", "Forest", "Endangered"],
  ["Babul", "Vachellia nilotica", "Tree", "Desert", "Desert", "Safe"],
  ["Khejri", "Prosopis cineraria", "Tree", "Desert", "Desert", "Safe"],
  ["Chinar", "Platanus orientalis", "Tree", "Himalayan", "Forest", "Safe"],
  ["Deodar Cedar", "Cedrus deodara", "Tree", "Himalayan", "Mountain", "Safe"],
  ["Chir Pine", "Pinus roxburghii", "Tree", "Himalayan", "Mountain", "Safe"],
  ["Himalayan Birch", "Betula utilis", "Tree", "Himalayan", "Mountain", "Near Threatened"],
  ["Bhojpatra", "Betula utilis", "Tree", "Himalayan", "Mountain", "Safe"],
  ["Coconut Palm", "Cocos nucifera", "Tree", "Coastal", "Coastal", "Safe"],
  ["Areca Nut Palm", "Areca catechu", "Tree", "Coastal", "Coastal", "Safe"],
  ["Palmyra Palm", "Borassus flabellifer", "Tree", "Coastal", "Coastal", "Safe"],
  ["Indian Laburnum", "Cassia fistula", "Tree", "Central India", "Forest", "Safe"],
  ["Kadamba", "Neolamarckia cadamba", "Tree", "Gangetic Plain", "Forest", "Safe"],
  ["Saptaparni", "Alstonia scholaris", "Tree", "North-East India", "Forest", "Safe"],
  ["Rubber Tree", "Ficus elastica", "Tree", "North-East India", "Forest", "Safe"],
  ["Bhendi Tree", "Thespesia populnea", "Tree", "Coastal", "Mangrove", "Safe"],
  ["Sundari Tree", "Heritiera fomes", "Tree", "Coastal", "Mangrove", "Endangered"],
  ["Agarwood", "Aquilaria malaccensis", "Tree", "North-East India", "Forest", "Critically Endangered"],
  ["Rhodo", "Rhododendron arboreum", "Tree", "Himalayan", "Mountain", "Safe"],
  ["Kadam", "Neolamarckia cadamba", "Tree", "Central India", "Forest", "Safe"],

  // ── Shrubs & Herbs & Medicinal (40) ──
  ["Holy Basil (Tulsi)", "Ocimum tenuiflorum", "Medicinal", "Gangetic Plain", "Grassland", "Safe"],
  ["Ashwagandha", "Withania somnifera", "Medicinal", "Deccan Plateau", "Scrubland", "Safe"],
  ["Aloe Vera", "Aloe barbadensis miller", "Medicinal", "Desert", "Desert", "Safe"],
  ["Sarpagandha", "Rauvolfia serpentina", "Medicinal", "Western Ghats", "Forest", "Endangered"],
  ["Brahmi", "Bacopa monnieri", "Medicinal", "Coastal", "Wetland", "Safe"],
  ["Giloy", "Tinospora cordifolia", "Medicinal", "Central India", "Forest", "Safe"],
  ["Shatavari", "Asparagus racemosus", "Medicinal", "Himalayan", "Forest", "Safe"],
  ["Amla (Indian Gooseberry)", "Phyllanthus emblica", "Shrub", "Central India", "Forest", "Safe"],
  ["Turmeric", "Curcuma longa", "Herb", "Western Ghats", "Forest", "Safe"],
  ["Cardamom", "Elettaria cardamomum", "Herb", "Western Ghats", "Forest", "Safe"],
  ["Black Pepper", "Piper nigrum", "Climber", "Western Ghats", "Forest", "Safe"],
  ["Betel", "Piper betle", "Climber", "North-East India", "Forest", "Safe"],
  ["Pudina (Mint)", "Mentha arvensis", "Herb", "Gangetic Plain", "Wetland", "Safe"],
  ["Coriander", "Coriandrum sativum", "Herb", "Deccan Plateau", "Grassland", "Safe"],
  ["Curry Tree", "Murraya koenigii", "Shrub", "Central India", "Scrubland", "Safe"],
  ["Mehendi (Henna)", "Lawsonia inermis", "Shrub", "Desert", "Desert", "Safe"],
  ["Jasminum", "Jasminum sambac", "Shrub", "Gangetic Plain", "Forest", "Safe"],
  ["Hibiscus", "Hibiscus rosa-sinensis", "Shrub", "Coastal", "Coastal", "Safe"],
  ["Bougainvillea", "Bougainvillea glabra", "Climber", "Deccan Plateau", "Scrubland", "Safe"],
  ["Lemon Grass", "Cymbopogon citratus", "Grass", "Western Ghats", "Grassland", "Safe"],
  ["Vetiver (Khus)", "Chrysopogon zizanioides", "Grass", "Gangetic Plain", "Wetland", "Safe"],
  ["Bamboo", "Bambusoideae", "Grass", "North-East India", "Forest", "Safe"],
  ["Cane", "Calamus rotang", "Climber", "Western Ghats", "Forest", "Safe"],
  ["Pitcher Plant", "Nepenthes khasiana", "Herb", "North-East India", "Wetland", "Endangered"],
  ["Kurinji", "Strobilanthes kunthiana", "Shrub", "Western Ghats", "Mountain", "Vulnerable"],
  ["Blue Poppy", "Meconopsis betonicifolia", "Herb", "Himalayan", "Mountain", "Safe"],
  ["Brahma Kamal", "Saussurea obvallata", "Herb", "Himalayan", "Mountain", "Endangered"],
  ["Lotus", "Nelumbo nucifera", "Herb", "Gangetic Plain", "Freshwater", "Safe"],
  ["Water Lily", "Nymphaea pubescens", "Herb", "Coastal", "Freshwater", "Safe"],
  ["Bhringraj", "Eclipta prostrata", "Medicinal", "Deccan Plateau", "Wetland", "Safe"],
  ["Kalmegh", "Andrographis paniculata", "Medicinal", "Eastern Ghats", "Forest", "Safe"],
  ["Shikakai", "Senegalia rugata", "Climber", "Central India", "Forest", "Safe"],
  ["Reetha (Soapnut)", "Sapindus mukorossi", "Tree", "Himalayan", "Forest", "Safe"],
  ["Guggal", "Commiphora wightii", "Medicinal", "Desert", "Desert", "Critically Endangered"],
  ["Satawari", "Asparagus racemosus", "Medicinal", "Central India", "Scrubland", "Safe"],
  ["Safed Musli", "Chlorophytum borivilianum", "Medicinal", "Deccan Plateau", "Forest", "Critically Endangered"],
  ["Kutki", "Picrorhiza kurroa", "Medicinal", "Himalayan", "Mountain", "Endangered"],
  ["Jatamansi", "Nardostachys jatamansi", "Medicinal", "Himalayan", "Mountain", "Critically Endangered"],
  ["Aconite", "Aconitum heterophyllum", "Medicinal", "Himalayan", "Mountain", "Endangered"],
  ["Chirata", "Swertia chirayita", "Medicinal", "Himalayan", "Mountain", "Critically Endangered"],

  // ── Shrubs, Grasses, Ferns & Others (25) ──
  ["Elephant Grass", "Pennisetum purpureum", "Grass", "Gangetic Plain", "Grassland", "Safe"],
  ["Kans Grass", "Saccharum spontaneum", "Grass", "Himalayan", "Wetland", "Safe"],
  ["Seagrass", "Zostera", "Grass", "Islands", "Marine", "Vulnerable"],
  ["Tree Fern", "Cyathea spinulosa", "Fern", "Eastern Ghats", "Forest", "Vulnerable"],
  ["Maidenhair Fern", "Adiantum capillus-veneris", "Fern", "Western Ghats", "Wetland", "Safe"],
  ["Lycopodium", "Lycopodium clavatum", "Fern", "North-East India", "Forest", "Safe"],
  ["Horsetail", "Equisetum arvense", "Fern", "Himalayan", "Wetland", "Safe"],
  ["Lichen", "Parmelia", "Other", "Himalayan", "Mountain", "Safe"],
  ["Moss", "Bryophyta", "Other", "Western Ghats", "Forest", "Safe"],
  ["Cycad", "Cycas beddomei", "Shrub", "Eastern Ghats", "Forest", "Critically Endangered"],
  ["Orchid (Foxtail)", "Rhynchostylis retusa", "Herb", "North-East India", "Forest", "Endangered"],
  ["Lady's Slipper Orchid", "Paphiopedilum druryi", "Herb", "Western Ghats", "Mountain", "Critically Endangered"],
  ["Blue Vanda Diffusa", "Vanda coerulea", "Herb", "North-East India", "Forest", "Endangered"],
  ["Mangrove Apple", "Sonneratia alba", "Tree", "Coastal", "Mangrove", "Safe"],
  ["Sea Holly", "Acanthus ilicifolius", "Shrub", "Coastal", "Mangrove", "Safe"],
  ["Nipa Palm", "Nypa fruticans", "Tree", "Islands", "Mangrove", "Vulnerable"],
  ["Indian Snakeroot", "Rauvolfia tetraphylla", "Medicinal", "Deccan Plateau", "Scrubland", "Safe"],
  ["Indigo", "Indigofera tinctoria", "Shrub", "Deccan Plateau", "Scrubland", "Safe"],
  ["Cotton", "Gossypium herbaceum", "Shrub", "Central India", "Grassland", "Safe"],
  ["Jute", "Corchorus olitorius", "Shrub", "Gangetic Plain", "Wetland", "Safe"],
  ["Tea Plant", "Camellia sinensis", "Shrub", "North-East India", "Mountain", "Safe"],
  ["Coffee Plant", "Coffea arabica", "Shrub", "Western Ghats", "Mountain", "Safe"],
  ["Saffron", "Crocus sativus", "Herb", "Himalayan", "Mountain", "Safe"],
  ["Mustard", "Brassica juncea", "Herb", "Gangetic Plain", "Grassland", "Safe"],
  ["Sugarcane", "Saccharum officinarum", "Grass", "Gangetic Plain", "Grassland", "Safe"]
];

const usesOptions = [
  "Provides vital habitat for local wildlife.",
  "Extensively used in traditional Ayurvedic medicine.",
  "A robust source of timber and architectural materials.",
  "Erosion control and ecosystem stabilization.",
  "Yields essential oils utilized in perfumery and cosmetics.",
  "Produces edible fruits, nuts, or seeds for local fauna.",
  "A keystone species that entirely defines its biome.",
  "Dyes and textiles generation."
];

const plantObjects = rawList.map((row) => ({
  name: row[0],
  scientificName: row[1],
  type: row[2],
  zone: row[3],
  ecosystem: row[4],
  conservationStatus: row[5],
  description: `The ${row[0]} (${row[1]}) is a distinguished ${row[2].toLowerCase()} endemic to the ${row[3]} region. Flourishing in a ${row[4].toLowerCase()} ecosystem, it possesses immense ecological and cultural significance in India.`,
  habitat: `Prefers ${row[4].toLowerCase()} environments scattered across the ${row[3]}.`,
  uses: [
    usesOptions[Math.floor(Math.random() * usesOptions.length)],
    usesOptions[Math.floor(Math.random() * usesOptions.length)]
  ],
  funFacts: [
    `The ${row[0]} is universally recognized for its unparalleled resilience in the ${row[3]}.`,
    `Often cited in historical Indian manuscripts for its unique properties.`
  ],
  imageUrl: "", 
  images: [],
}));

const seedPlants = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");
    
    await Plant.deleteMany();
    console.log("Cleared existing plant database.");

    const result = await Plant.insertMany(plantObjects);
    console.log(`✅ Successfully seeded ${result.length} native Indian flora species!`);

    process.exit(0);
  } catch (e) {
    console.error("Error setting up DB:", e);
    process.exit(1);
  }
}

seedPlants();
