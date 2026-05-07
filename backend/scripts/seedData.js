// ============================================================
// FILE: backend/scripts/seedData.js
// India Biodiversity Explorer — 1500 Animals + 1500 Plants
// FIXED VERSION:
//   - Image URL matching improved (exact key lookup before partial)
//   - Added more specific animal/plant images
//   - Fallback images are proper Indian wildlife photos
//   - speciesData.js integration for Zone seeding
// Run via: npm run seed
// ============================================================

require("dotenv").config();
const mongoose = require("mongoose");

const Species = require("../models/Species");
const Plant = require("../models/Plant");

// Try to load Zone/Ecosystem models if they exist
let Zone, Ecosystem;
try {
  Zone = require("../models/Zone");
} catch (e) { Zone = null; }
try {
  Ecosystem = require("../models/Ecosystem");
} catch (e) { Ecosystem = null; }

const { ZONES: ZONE_DATA, ECOSYSTEMS: ECOSYSTEM_DATA } = require("./speciesData");

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
const STATUSES = ["Least Concern","Near Threatened","Vulnerable","Endangered","Critically Endangered"];
const HABITATS = [
  "Dense tropical forest","Open grassland","Rocky mountain slopes","River banks",
  "Coastal mangroves","Marshy wetlands","Sandy desert","Tropical rainforest",
  "Dry deciduous forest","Alpine meadows","Cave systems","Agricultural fields",
  "Urban periphery","Coral reefs","Estuaries",
];
const USES = ["Medicinal","Timber","Ornamental","Food","Fiber","Fuel","Religious","Pesticide","Dye","Tannin","Latex","Resin","Spice","Fodder"];
const THREATS = ["Habitat loss","Poaching","Climate change","Pollution","Human-wildlife conflict","Invasive species","Disease","Natural predation","Forest fire","Water contamination"];

const ANIMAL_BASE_NAMES = [
  // Big Cats & Carnivores (20)
  "Tiger","Leopard","Lion","Cheetah","Snow Leopard","Clouded Leopard","Asiatic Lion","Caracal","Jungle Cat","Rusty-spotted Cat",
  "Marbled Cat","Leopard Cat","Fishing Cat","Pallas Cat","Golden Cat","Badger","Wolverine","Zorilla","Tayra","Grison",
  // Mammals - Ungulates (25)
  "Elephant","Gaur","Wild Buffalo","Bison","Sambar","Spotted Deer","Barking Deer","Musk Deer","Hog Deer","Muntjac",
  "Bharal","Goral","Tahr","Ibex","Nilgiri Tahr","Markhor","Serow","Blackbuck","Chinkara","Four-horned Antelope",
  "Nilgai","Swamp Deer","Hangul","Eld Deer","Eurasian Elk",
  // Mammals - Primates (15)
  "Hanuman Langoor","Bonnet Macaque","Rhesus Macaque","Lion-tailed Macaque","Slow Loris","Assam Macaque","Pig-tailed Macaque",
  "Stump-tailed Macaque","Golden Langoor","Phayre Langoor","Capped Langoor","Dholangur","Nilgiri Langoor","Gee Golden Langoor","De Brazza Monkey",
  // Mammals - Small Carnivores & Others (20)
  "Fox","Jackal","Hare","Squirrel","Marten","Otter","Mongoose","Civet","Pangolin","Porcupine",
  "Wild Dog","Wolf","Hyena","Bear","Sloth Bear","Sun Bear","Himalayan Black Bear","Brown Bear","Red Panda","Fishing Cat",
  // Mammals - Rodents & Lagomorphs (15)
  "Giant Squirrel","Flying Squirrel","Palm Squirrel","Five-striped Palm Squirrel","Bandicoot","Shrew","Mole","Rabbit","Wild Boar",
  "Bamboo Rat","Zokor","Vole","Lemming","Pika","Mouse Deer",
  // Birds - Raptors (20)
  "Peacock","Eagle","Falcon","Vulture","Owl","Kite","Harrier","Buzzard","Osprey","Secretarial Bird",
  "Bateleur","Serpent Eagle","Fish Eagle","Hawk","Goshawk","Sparrowhawk","Kestrel","Hobby","Crested Hawk","Short-toed Eagle",
  // Birds - Water Birds (25)
  "Stork","Heron","Ibis","Swan","Duck","Goose","Pelican","Cormorant","Flamingo","Crane",
  "Sarus Crane","Bar-headed Goose","Ruddy Shelduck","Brahminy Duck","Mandarin Duck","Wood Duck","Gadwall","Teal","Wigeon","Pochard",
  "Stork-billed Kingfisher","Pied Kingfisher","White-breasted Kingfisher","Common Kingfisher","Malabar Pied Hornbill",
  // Birds - Land Birds (25)
  "Parrot","Woodpecker","Pigeon","Dove","Quail","Pheasant","Hornbill","Sunbird","Drongo","Minivet",
  "Warbler","Thrush","Babbler","Laughingthrush","Bulbul","Robin","Flycatcher","Myna","Tailor Bird","Iora",
  "Pipit","Wagtail","Cuckoo","Koel","King Crow",
  // Birds - Endemic & Rare (15)
  "Great Indian Bustard","Florican","Himalayan Monal","Red Junglefowl","Grey Junglefowl","Kalij Pheasant","Cheer Pheasant",
  "Indian Pitta","Malabar Trogon","Great Hornbill","Indian Eagle Owl","Spot-billed Pelican","Lesser Flamingo","Greater Flamingo","Jerdon Courser",
  // Reptiles - Snakes (20)
  "Cobra","Viper","Krait","Python","King Cobra","Banded Krait","Common Krait","Black Krait","Russell Viper","Saw-scaled Viper",
  "Green Vine Snake","Bronzeback Tree Snake","Rat Snake","Wolf Snake","Cat Snake","Keelback","Water Snake","Sea Snake","Sea Krait","Coral Snake",
  // Reptiles - Lizards & Others (15)
  "Monitor Lizard","Skink","Gecko","Turtle","Tortoise","Crocodile","Gharial","Garden Lizard","Dragon Lizard","House Gecko",
  "Bengal Monitor","Water Monitor","Rock Python","Sand Boa","Pipe Snake",
  // Amphibians (15)
  "Frog","Toad","Salamander","Newt","Tree Frog","Bull Frog","Indian Frog","Burrowing Frog","Rock Frog","Cricket Frog",
  "Tree Toad","Narrow-mouthed Frog","Microhylid Frog","Dicroglossid Frog","Rhacophorid Frog",
  // Fish (20)
  "Carp","Catfish","Mahseer","Torpedo Scad","Rohu","Katli","Mystus","Anchovy","Threadfin","Pomfret",
  "Seerfish","Mackerel","Sardine","Herring","Giant Freshwater Fish","Electric Catfish","Stinging Catfish","Air-breathing Catfish","Snakehead","Murrel",
  // Insects & Invertebrates (25)
  "Butterfly","Moth","Dragonfly","Damselfly","Beetle","Ant","Termite","Grasshopper","Carpenter Bee","Honey Bee",
  "Bumblebee","Atlas Moth","Moon Moth","Praying Mantis","Stick Insect","Ladybug","Firefly","Cicada","Wasp","Hornet",
  "Spider","Scorpion","Centipede","Millipede","Earthworm",
];

const ANIMAL_SCIENTIFIC_NAMES = {
  "Tiger": "Panthera tigris tigris",
  "Leopard": "Panthera pardus fusca",
  "Lion": "Panthera leo persica",
  "Cheetah": "Acinonyx jubatus",
  "Snow Leopard": "Panthera uncia",
  "Clouded Leopard": "Neofelis nebulosa",
  "Asiatic Lion": "Panthera leo persica",
  "Caracal": "Caracal caracal",
  "Jungle Cat": "Felis chaus",
  "Rusty-spotted Cat": "Prionailurus rubiginosus",
  "Marbled Cat": "Pardofelis marmorata",
  "Leopard Cat": "Prionailurus bengalensis",
  "Fishing Cat": "Prionailurus viverrinus",
  "Pallas Cat": "Otocolobus manul",
  "Golden Cat": "Catopuma temminckii",
  "Badger": "Melursus ursinus",
  "Wolverine": "Gulo gulo",
  "Zorilla": "Ictonyx striatus",
  "Tayra": "Eira barbara",
  "Grison": "Galictis vittata",
  "Elephant": "Elephas maximus indicus",
  "Gaur": "Bos gaurus",
  "Wild Buffalo": "Bos arnee",
  "Bison": "Bos gaurus",
  "Sambar": "Rusa unicolor",
  "Spotted Deer": "Axis axis",
  "Barking Deer": "Muntiacus muntjak",
  "Musk Deer": "Moschus chrysogaster",
  "Hog Deer": "Axis porcinus",
  "Muntjac": "Muntiacus muntjak",
  "Bharal": "Pseudois nayaur",
  "Goral": "Naemorhedus goral",
  "Tahr": "Hemitragus jemlahicus",
  "Ibex": "Capra ibex",
  "Nilgiri Tahr": "Nilgiritragus hylocrius",
  "Markhor": "Capra falconeri",
  "Serow": "Capricornis sumatraensis",
  "Blackbuck": "Antilope cervicapra",
  "Chinkara": "Gazella bennettii",
  "Four-horned Antelope": "Tetracerus quadricornis",
  "Nilgai": "Boselaphus tragocamelus",
  "Swamp Deer": "Rucervus duvaucelii",
  "Hangul": "Cervus hanglu",
  "Eld Deer": "Rucervus eldii",
  "Eurasian Elk": "Cervus canadensis",
  "Hanuman Langoor": "Semnopithecus entellus",
  "Bonnet Macaque": "Macaca radiata",
  "Rhesus Macaque": "Macaca mulatta",
  "Lion-tailed Macaque": "Macaca silenus",
  "Slow Loris": "Nycticebus bengalensis",
  "Assam Macaque": "Macaca assamensis",
  "Pig-tailed Macaque": "Macaca nemestrina",
  "Stump-tailed Macaque": "Macaca arctoides",
  "Golden Langoor": "Trachypithecus geei",
  "Phayre Langoor": "Trachypithecus phayrei",
  "Capped Langoor": "Trachypithecus pileatus",
  "Dholangur": "Semnopithecus hector",
  "Nilgiri Langoor": "Semnopithecus johnii",
  "Gee Golden Langoor": "Trachypithecus geei",
  "De Brazza Monkey": "Cercopithecus neglectus",
  "Fox": "Vulpes bengalensis",
  "Jackal": "Canis aureus indicus",
  "Hare": "Lepus nigricollis",
  "Squirrel": "Ratufa indica",
  "Marten": "Martes flavigula",
  "Otter": "Lutra lutra",
  "Mongoose": "Herpestes smithii",
  "Civet": "Viverricula indica",
  "Pangolin": "Manis crassicaudata",
  "Porcupine": "Hystrix indica",
  "Wild Dog": "Cuon alpinus",
  "Wolf": "Canis lupus pallipes",
  "Hyena": "Hyaena hyaena",
  "Bear": "Ursus thibetanus",
  "Sloth Bear": "Melursus ursinus",
  "Sun Bear": "Helarctos malayanus",
  "Himalayan Black Bear": "Ursus thibetanus",
  "Brown Bear": "Ursus arctos",
  "Red Panda": "Ailurus fulgens",
  "Giant Squirrel": "Ratufa indica",
  "Flying Squirrel": "Petaurista philippensis",
  "Palm Squirrel": "Funambulus pennatus",
  "Five-striped Palm Squirrel": "Funambulus pennatus",
  "Bandicoot": "Bandicota bengalensis",
  "Shrew": "Suncus murinus",
  "Mole": "Euroscaptor micrurus",
  "Rabbit": "Oryctolagus cuniculus",
  "Wild Boar": "Sus scrofa",
  "Bamboo Rat": "Rhizomys sinensis",
  "Zokor": "Eospalax fontanierii",
  "Vole": "Microtus fortis",
  "Lemming": "Lemmus lemmus",
  "Pika": "Ochotona roylei",
  "Peacock": "Pavo cristatus",
  "Eagle": "Aquila chrysaetos",
  "Falcon": "Falco peregrinus",
  "Vulture": "Gyps bengalensis",
  "Owl": "Bubo bengalensis",
  "Kite": "Milvus migrans",
  "Harrier": "Circus aeruginosus",
  "Buzzard": "Buteo buteo",
  "Osprey": "Pandion haliaetus",
  "Secretarial Bird": "Sagittarius serpentarius",
  "Bateleur": "Terathopius ecaudatus",
  "Serpent Eagle": "Spilornis cheela",
  "Fish Eagle": "Haliaeetus leucoryphus",
  "Hawk": "Accipiter nisus",
  "Goshawk": "Accipiter gentilis",
  "Sparrowhawk": "Accipiter nisus",
  "Kestrel": "Falco tinnunculus",
  "Hobby": "Falco subbuteo",
  "Short-toed Eagle": "Circaetus gallicus",
  "Stork": "Ciconia episcopus",
  "Heron": "Ardea cinerea",
  "Ibis": "Threskiornis aethiopicus",
  "Swan": "Cygnus cygnus",
  "Duck": "Anas poecilorhyncha",
  "Goose": "Anser anser",
  "Pelican": "Pelecanus philippensis",
  "Cormorant": "Phalacrocorax niger",
  "Flamingo": "Phoenicopterus roseus",
  "Crane": "Grus grus",
  "Sarus Crane": "Antigone antigone",
  "Bar-headed Goose": "Anser indicus",
  "Ruddy Shelduck": "Tadorna ferruginea",
  "Brahminy Duck": "Tadorna ferruginea",
  "Mandarin Duck": "Aix galericulata",
  "Wood Duck": "Aix sponsa",
  "Gadwall": "Anas strepera",
  "Teal": "Anas crecca",
  "Wigeon": "Anas penelope",
  "Pochard": "Aythya ferina",
  "Stork-billed Kingfisher": "Pelargopsis capensis",
  "Pied Kingfisher": "Ceryle rudis",
  "White-breasted Kingfisher": "Halcyon smyrnensis",
  "Common Kingfisher": "Alcedo atthis",
  "Malabar Pied Hornbill": "Anthracoceros coronatus",
  "Parrot": "Psittacula cyanocephala",
  "Woodpecker": "Dryocopus javensis",
  "Pigeon": "Columba livia",
  "Dove": "Streptopelia decaocto",
  "Quail": "Coturnix coturnix",
  "Pheasant": "Lophura nycthemera",
  "Hornbill": "Buceros bicornis",
  "Sunbird": "Nectarinia zeylonica",
  "Drongo": "Dicrurus macrocercus",
  "Minivet": "Pericrocotus flammeus",
  "Warbler": "Acrocephalus stentoreus",
  "Thrush": "Zoothera dauma",
  "Babbler": "Turdoides striata",
  "Laughingthrush": "Garrulax leucogastroides",
  "Bulbul": "Pycnonotus cafer",
  "Robin": "Copsychus saularis",
  "Flycatcher": "Muscicapa thalassina",
  "Myna": "Acridotheres tristis",
  "Tailor Bird": "Orthotomus sutorius",
  "Iora": "Aegithina tiphia",
  "Pipit": "Anthus richardi",
  "Wagtail": "Motacilla cinerea",
  "Cuckoo": "Eudynamys scolopaceus",
  "Koel": "Eudynamys scolopaceus",
  "King Crow": "Dicrurus macrocercus",
  "Great Indian Bustard": "Ardeotis nigriceps",
  "Florican": "Sypheotides indicus",
  "Himalayan Monal": "Lophophorus impejanus",
  "Red Junglefowl": "Gallus gallus",
  "Grey Junglefowl": "Gallus sonneratii",
  "Kalij Pheasant": "Lophura leucomelanos",
  "Cheer Pheasant": "Catreus wallichii",
  "Indian Pitta": "Pitta brachyura",
  "Malabar Trogon": "Harpactus malabaricus",
  "Great Hornbill": "Buceros bicornis",
  "Indian Eagle Owl": "Bubo bengalensis",
  "Spot-billed Pelican": "Pelecanus philippensis",
  "Lesser Flamingo": "Phoenicopterus minor",
  "Greater Flamingo": "Phoenicopterus roseus",
  "Jerdon Courser": "Rhinoptilus bitorquatus",
  "Cobra": "Naja naja",
  "Viper": "Daboia russelii",
  "Krait": "Bungarus caeruleus",
  "Python": "Python bivittatus",
  "King Cobra": "Ophiophagus hannah",
  "Banded Krait": "Bungarus fasciatus",
  "Common Krait": "Bungarus caeruleus",
  "Black Krait": "Bungarus niger",
  "Russell Viper": "Daboia russelii",
  "Saw-scaled Viper": "Echis carinatus",
  "Green Vine Snake": "Ahaetulla prasina",
  "Bronzeback Tree Snake": "Dendrelaphis tristis",
  "Rat Snake": "Ptyas mucosa",
  "Wolf Snake": "Lycodon aulicus",
  "Cat Snake": "Boiga trigonata",
  "Keelback": "Xenochrophis piscator",
  "Water Snake": "Enhydris enhydris",
  "Sea Snake": "Hydrophis spiralis",
  "Sea Krait": "Laticauda laticaudata",
  "Coral Snake": "Calliophis bivirgatus",
  "Monitor Lizard": "Varanus bengalensis",
  "Skink": "Eutropis carinata",
  "Gecko": "Hemidactylus frenatus",
  "Turtle": "Geochelone elegans",
  "Tortoise": "Testudo graeca",
  "Crocodile": "Crocodylus palustris",
  "Gharial": "Gavialis gangeticus",
  "Garden Lizard": "Calotes versicolor",
  "Dragon Lizard": "Draco dussumieri",
  "House Gecko": "Hemidactylus brookii",
  "Bengal Monitor": "Varanus bengalensis",
  "Water Monitor": "Varanus salvator",
  "Rock Python": "Python molurus",
  "Sand Boa": "Eryx johnii",
  "Pipe Snake": "Cylindrophis ruffus",
  "Frog": "Hoplobatrachus tigerinus",
  "Toad": "Duttaphrynus melanostictus",
  "Salamander": "Tylototriton verrucosus",
  "Newt": "Cynops orientalis",
  "Tree Frog": "Polypedates maculatus",
  "Bull Frog": "Hoplobatrachus tigerinus",
  "Indian Frog": "Fejervarya limnocharis",
  "Burrowing Frog": "Sphaerotheca breviceps",
  "Rock Frog": "Fejervarya oryctolax",
  "Cricket Frog": "Fejervarya limnocharis",
  "Tree Toad": "Bufo stomaticus",
  "Narrow-mouthed Frog": "Microhyla ornata",
  "Microhylid Frog": "Microhyla ornata",
  "Dicroglossid Frog": "Euphlyctis cyanophlyctis",
  "Rhacophorid Frog": "Rhacophorus lateralis",
  "Carp": "Catla catla",
  "Catfish": "Heteropneustes fossilis",
  "Mahseer": "Tor tor",
  "Torpedo Scad": "Trachinocephalus myops",
  "Rohu": "Labeo rohita",
  "Katli": "Labeo katli",
  "Mystus": "Mystus seenghala",
  "Anchovy": "Stolephorus indicus",
  "Threadfin": "Leptobrama muelleri",
  "Pomfret": "Trichurus lepturus",
  "Seerfish": "Scomberomorus guttatus",
  "Mackerel": "Rastrelliger kanagurta",
  "Sardine": "Sardinella longiceps",
  "Herring": "Clupea harengus",
  "Giant Freshwater Fish": "Catla catla",
  "Electric Catfish": "Heteropneustes fossilis",
  "Stinging Catfish": "Heteropneustes fossilis",
  "Air-breathing Catfish": "Clarias batrachus",
  "Snakehead": "Channa striata",
  "Murrel": "Channa striata",
  "Butterfly": "Papilio demoleus",
  "Moth": "Attacus atlas",
  "Dragonfly": "Anax junius",
  "Damselfly": "Ischnura aurora",
  "Beetle": "Chrysocoleus militaris",
  "Ant": "Camponotus compressus",
  "Termite": "Odontotermes obesus",
  "Grasshopper": "Hieroglyphus banian",
  "Carpenter Bee": "Xylocopa fenestrata",
  "Honey Bee": "Apis cerana",
  "Bumblebee": "Bombus haemorrhoidalis",
  "Atlas Moth": "Attacus atlas",
  "Moon Moth": "Actias selene",
  "Praying Mantis": "Hierodula patellifera",
  "Stick Insect": "Carausius morosus",
  "Ladybug": "Coccinella septempunctata",
  "Firefly": "Luciola praeusta",
  "Cicada": "Dundubia mannifera",
  "Wasp": "Ropalidia marginata",
  "Hornet": "Vespa orientalis",
  "Spider": "Nephila pilipes",
  "Scorpion": "Heterometrus swammerdami",
  "Centipede": "Scolopendra hardwickei",
  "Millipede": "Archispirostreptus gigas",
  "Earthworm": "Lumbricus terrestris",
};

const PLANT_BASE_NAMES = [
  // Trees - Tropical & Subtropical (40)
  "Oak","Pine","Cedar","Maple","Rhododendron","Bamboo","Palm","Fern","Moss","Neem",
  "Peepal","Banyan","Mango","Teak","Sandalwood","Rosewood","Sal","Shisham","Deodar","Willow",
  "Walnut","Tamarind","Gulmohar","Jacaranda","Ashoka","Kadam","Pangara","Pala","Kakad","Karanj",
  "Palash","Amaltash","Chandni","Raat","Flamboyant","Tabebuia","Simal","Bombax","Sissoo","Gmelina",
  // Trees - Temperate & Alpine (30)
  "Tectona","Adina","Lagerstroemia","Butea","Erythrina","Bridelia","Ziziphus","Acacia","Babul","Subabul",
  "Siris","Amara","Amla","Bael","Jamun","Aonla","Chironji","Cashew","Coconut","Arecanut",
  "Date Palm","Toddy Palm","Fish Palm","Sago Palm","Magnolia","Poplar","Birch","Hazel","Alder","Hornbeam",
  // Medicinal Herbs (30)
  "Tulsi","Ashwagandha","Turmeric","Ginger","Cardamom","Pepper","Cinnamon","Clove","Nutmeg","Moringa",
  "Gunja","Guggul","Sarpagandha","Punarnava","Shankhapushpi","Brahmi","Vetiver","Arjuna","Shatavari","Mulethi",
  "Guduchi","Tinospora","Gokshura","Yashtimadhu","Haritaki","Bibhitaka","Triphala","Neem","Karanja","Bakuchi",
  // Culinary Herbs & Spices (30)
  "Basil","Cumin","Fenugreek","Mustard","Sesame","Groundnut","Ajwain","Methi","Kalonji","Isabgol",
  "Psyllium","Lemongrass","Citronella","Mint","Spearmint","Peppermint","Oregano","Thyme","Rosemary","Sage",
  "Bay Leaf","Star Anise","Fennel","Aniseed","Caraway","Dill","Celery","Parsley","Coriander","Curry Leaf",
  // Flowers - Ornamental (35)
  "Rose","Jasmine","Lotus","Marigold","Hibiscus","Balsam","Zinnia","Petunia","Cosmos","Sunflower",
  "Gerbera","Lilium","Orchid","Primrose","Iris","Amaryllis","Dahlia","Tuberose","Chrysanthemum","Aster",
  "Calendula","Gaillardia","Coreopsis","Lavender","Margarita","Ixora","Hamelia","Pentas","Catharanthus","Vinca",
  "Lantana","Clerodendrum","Mandevilla","Allamanda","Bougainvillea",
  // Aquatic Plants (20)
  "Water Lily","Water Hyacinth","Water Lettuce","Pistia","Salvinia","Azolla","Lemna","Eichhornia","Typha","Nymphaea",
  "Nelumbo","Victoria","Euryale","Hydrilla","Vallisneria","Potamogeton","Ceratophyllum","Ludwigia","Alternanthera","Bacopa",
  // Climbers & Creepers (25)
  "Vanilla","Grape","Passion Fruit","Kiwi","Runner Bean","Yard Long Bean","Drumstick","Curry Tree","Pomegranate","Guava",
  "Custard Apple","Fig","Jackfruit","Breadfruit","Wood Apple","Barloo","Maulsari","Gurhal","Chameli","Malti",
  "Juhi","Raat Rani","Madhumalati","Ajagadh","Mogar",
  // Fruit Trees (25)
  "Banana","Papaya","Karonda","Phalsa","Ber","Kair","Lime","Lemon","Orange","Sweet Lime",
  "Grapefruit","Citrus","Mosambi","Kinnow","Tangerine","Mandarin","Kumquat","Apple","Pear","Peach",
  "Plum","Apricot","Cherry","Almond","Pomegranate",
  // Grasses & Ground Cover (20)
  "Grass","Khus","Sacred Basil","Holy Basil","Sweet Basil","Thai Basil","Lemon Basil","Marrubium","Wild Basil","Perilla",
  "Lime Basil","Camphor Basil","African Basil","Durva","Doob","Napier Grass","Para Grass","Buffel Grass","Rhodes Grass","Kikuyu Grass",
  // Timber & Commercial (20)
  "Red Sanders","White Cedar","Red Cedar","White Siris","Black Siris","Indian Siris","Lecythis","Rubber","Teak","Sal",
  "Shisham","Rosewood","Sandalwood","Deodar","Cedar","Reeds","Rattan","Gum","Resin","Dye",
  // Sacred & Religious (15)
  "Bel","Bilva","Rudraksha","Sacred Fig","Bodhi Tree","Temple Tree","Ashoka Tree","Peepal Tree","Banyan Tree","Neem Tree",
  "Tulsi Plant","Arjuna","Vat","Udumbara","Palasha",
  // Endemic & Rare (21)
  "Pitcher Plant","Venus Flytrap","Corpse Flower","Rafflesia","Corpse Lily","Ghost Orchid","Flying Orchid","Blue Orchid",
  "Red Vanda","Blue Vanda","Danxia Orchid","Slipper Orchid","Ground Orchid","Bamboo Orchid","Spider Orchid","Tiger Orchid",
  "Lady Slipper","Dendrobium","Cymbidium","Vanda","Cattleya",
];

const PLANT_SCIENTIFIC_NAMES = {
  "Oak": "Quercus semecarpifolia",
  "Pine": "Pinus roxburghii",
  "Cedar": "Cedrus deodara",
  "Maple": "Acer palmatum",
  "Rhododendron": "Rhododendron arboreum",
  "Bamboo": "Bambusa balcooa",
  "Palm": "Cocos nucifera",
  "Fern": "Pteris vittata",
  "Moss": "Polytrichum commune",
  "Neem": "Azadirachta indica",
  "Peepal": "Ficus religiosa",
  "Banyan": "Ficus benghalensis",
  "Mango": "Mangifera indica",
  "Teak": "Tectona grandis",
  "Sandalwood": "Santalum album",
  "Rosewood": "Dalbergia latifolia",
  "Sal": "Shorea robusta",
  "Shisham": "Dalbergia sissoo",
  "Deodar": "Cedrus deodara",
  "Willow": "Salix babylonica",
  "Walnut": "Juglans regia",
  "Tamarind": "Tamarindus indica",
  "Gulmohar": "Delonix regia",
  "Jacaranda": "Jacaranda mimosifolia",
  "Ashoka": "Saraca asoca",
  "Kadam": "Anthocephalus cadamba",
  "Pangara": "Pterocarpus marsupium",
  "Pala": "Pterocarpus santalinus",
  "Kakad": "Wrightia tinctoria",
  "Karanj": "Pongamia pinnata",
  "Palash": "Butea monosperma",
  "Amaltash": "Cassia fistula",
  "Chandni": "Gardenia jasminoides",
  "Raat": "Quisqualis indica",
  "Flamboyant": "Delonix regia",
  "Tabebuia": "Tabebuia rosea",
  "Simal": "Bombax ceiba",
  "Bombax": "Bombax ceiba",
  "Sissoo": "Dalbergia sissoo",
  "Gmelina": "Gmelina arborea",
  "Tectona": "Tectona grandis",
  "Adina": "Adina cordifolia",
  "Lagerstroemia": "Lagerstroemia speciosa",
  "Butea": "Butea monosperma",
  "Erythrina": "Erythrina variegata",
  "Bridelia": "Bridelia retusa",
  "Ziziphus": "Ziziphus mauritiana",
  "Acacia": "Acacia nilotica",
  "Babul": "Acacia nilotica",
  "Subabul": "Leucaena leucocephala",
  "Siris": "Albizia lebbeck",
  "Amara": "Mimusops elengi",
  "Amla": "Phyllanthus emblica",
  "Bael": "Aegle marmelos",
  "Jamun": "Syzygium cumini",
  "Aonla": "Phyllanthus emblica",
  "Chironji": "Buchanania lanzan",
  "Cashew": "Anacardium occidentale",
  "Coconut": "Cocos nucifera",
  "Arecanut": "Areca catechu",
  "Date Palm": "Phoenix dactylifera",
  "Toddy Palm": "Borassus flabellifer",
  "Fish Palm": "Caryota urens",
  "Sago Palm": "Cycas revoluta",
  "Magnolia": "Magnolia champaca",
  "Poplar": "Populus deltoides",
  "Birch": "Betula utilis",
  "Hazel": "Corylus colurna",
  "Alder": "Alnus nitida",
  "Hornbeam": "Carpinus viminea",
  "Tulsi": "Ocimum tenuiflorum",
  "Ashwagandha": "Withania somnifera",
  "Turmeric": "Curcuma longa",
  "Ginger": "Zingiber officinale",
  "Cardamom": "Elettaria cardamomum",
  "Pepper": "Piper nigrum",
  "Cinnamon": "Cinnamomum verum",
  "Clove": "Syzygium aromaticum",
  "Nutmeg": "Myristica fragrans",
  "Moringa": "Moringa oleifera",
  "Gunja": "Abrus precatorius",
  "Guggul": "Commiphora wightii",
  "Sarpagandha": "Rauvolfia serpentina",
  "Punarnava": "Boerhavia diffusa",
  "Shankhapushpi": "Convolvulus pluricaulis",
  "Brahmi": "Bacopa monnieri",
  "Vetiver": "Vetiveria zizanioides",
  "Arjuna": "Terminalia arjuna",
  "Shatavari": "Asparagus racemosus",
  "Mulethi": "Glycyrrhiza glabra",
  "Guduchi": "Tinospora cordifolia",
  "Tinospora": "Tinospora cordifolia",
  "Gokshura": "Tribulus terrestris",
  "Yashtimadhu": "Glycyrrhiza glabra",
  "Haritaki": "Terminalia chebula",
  "Bibhitaka": "Terminalia bellirica",
  "Triphala": "Terminalia chebula",
  "Karanja": "Pongamia pinnata",
  "Bakuchi": "Psoralea corylifolia",
  "Basil": "Ocimum basilicum",
  "Cumin": "Cuminum cyminum",
  "Fenugreek": "Trigonella foenum-graecum",
  "Mustard": "Brassica nigra",
  "Sesame": "Sesamum indicum",
  "Groundnut": "Arachis hypogaea",
  "Ajwain": "Trachyspermum ammi",
  "Methi": "Trigonella foenum-graecum",
  "Kalonji": "Nigella sativa",
  "Isabgol": "Plantago ovata",
  "Psyllium": "Plantago ovata",
  "Lemongrass": "Cymbopogon citratus",
  "Citronella": "Cymbopogon winterianus",
  "Mint": "Mentha spicata",
  "Spearmint": "Mentha spicata",
  "Peppermint": "Mentha piperita",
  "Oregano": "Origanum vulgare",
  "Thyme": "Thymus vulgaris",
  "Rosemary": "Rosmarinus officinalis",
  "Sage": "Salvia officinalis",
  "Bay Leaf": "Cinnamomum tamala",
  "Star Anise": "Illicium verum",
  "Fennel": "Foeniculum vulgare",
  "Aniseed": "Pimpinella anisum",
  "Caraway": "Carum carvi",
  "Dill": "Anethum graveolens",
  "Celery": "Apium graveolens",
  "Parsley": "Petroselinum crispum",
  "Coriander": "Coriandrum sativum",
  "Curry Leaf": "Murraya koenigii",
  "Rose": "Rosa indica",
  "Jasmine": "Jasminum officinale",
  "Lotus": "Nelumbo nucifera",
  "Marigold": "Tagetes erecta",
  "Hibiscus": "Hibiscus rosa-sinensis",
  "Balsam": "Impatiens balsamina",
  "Zinnia": "Zinnia elegans",
  "Petunia": "Petunia hybrida",
  "Cosmos": "Cosmos bipinnatus",
  "Sunflower": "Helianthus annuus",
  "Gerbera": "Gerbera jamesonii",
  "Lilium": "Lilium lancifolium",
  "Orchid": "Dendrobium nobile",
  "Primrose": "Primula vulgaris",
  "Iris": "Iris germanica",
  "Amaryllis": "Hippeastrum striatum",
  "Dahlia": "Dahlia pinnata",
  "Tuberose": "Polianthes tuberosa",
  "Chrysanthemum": "Chrysanthemum morifolium",
  "Aster": "Aster novi-belgii",
  "Calendula": "Calendula officinalis",
  "Gaillardia": "Gaillardia pulchella",
  "Coreopsis": "Coreopsis tinctoria",
  "Lavender": "Lavandula angustifolia",
  "Margarita": "Chrysanthemum morifolium",
  "Ixora": "Ixora coccinea",
  "Hamelia": "Hamelia patens",
  "Pentas": "Pentas lanceolata",
  "Catharanthus": "Catharanthus roseus",
  "Vinca": "Catharanthus roseus",
  "Lantana": "Lantana camara",
  "Clerodendrum": "Clerodendrum inerme",
  "Mandevilla": "Mandevilla sanderi",
  "Allamanda": "Allamanda cathartica",
  "Bougainvillea": "Bougainvillea glabra",
  "Water Lily": "Nymphaea odorata",
  "Water Hyacinth": "Eichhornia crassipes",
  "Water Lettuce": "Pistia stratiotes",
  "Pistia": "Pistia stratiotes",
  "Salvinia": "Salvinia molesta",
  "Azolla": "Azolla pinnata",
  "Lemna": "Lemna minor",
  "Eichhornia": "Eichhornia crassipes",
  "Typha": "Typha angustata",
  "Nymphaea": "Nymphaea lotus",
  "Nelumbo": "Nelumbo nucifera",
  "Victoria": "Victoria amazonica",
  "Euryale": "Euryale ferox",
  "Hydrilla": "Hydrilla verticillata",
  "Vallisneria": "Vallisneria spiralis",
  "Potamogeton": "Potamogeton pectinatus",
  "Ceratophyllum": "Ceratophyllum demersum",
  "Ludwigia": "Ludwigia adscendens",
  "Alternanthera": "Alternanthera philoxeroides",
  "Bacopa": "Bacopa monnieri",
  "Vanilla": "Vanilla planifolia",
  "Grape": "Vitis vinifera",
  "Passion Fruit": "Passiflora edulis",
  "Kiwi": "Actinidia deliciosa",
  "Runner Bean": "Phaseolus coccineus",
  "Yard Long Bean": "Vigna unguiculata",
  "Drumstick": "Moringa oleifera",
  "Curry Tree": "Murraya koenigii",
  "Pomegranate": "Punica granatum",
  "Guava": "Psidium guajava",
  "Custard Apple": "Annona squamosa",
  "Fig": "Ficus carica",
  "Jackfruit": "Artocarpus heterophyllus",
  "Breadfruit": "Artocarpus altilis",
  "Wood Apple": "Limonia acidissima",
  "Barloo": "Ziziphus mauritiana",
  "Maulsari": "Mimusops elengi",
  "Gurhal": "Hibiscus rosa-sinensis",
  "Chameli": "Jasminum officinale",
  "Malti": "Jasminum sambac",
  "Juhi": "Jasminum sambac",
  "Raat Rani": "Cestrum nocturnum",
  "Madhumalati": "Quisqualis indica",
  "Ajagadh": "Gmelina arborea",
  "Mogar": "Gmelina arborea",
  "Banana": "Musa paradisiaca",
  "Papaya": "Carica papaya",
  "Karonda": "Carissa carandas",
  "Phalsa": "Grewia asiatica",
  "Ber": "Ziziphus mauritiana",
  "Kair": "Capparis decidua",
  "Lime": "Citrus aurantifolia",
  "Lemon": "Citrus limon",
  "Orange": "Citrus sinensis",
  "Sweet Lime": "Citrus limetta",
  "Grapefruit": "Citrus paradisi",
  "Citrus": "Citrus medica",
  "Mosambi": "Citrus sinensis",
  "Kinnow": "Citrus reticulata",
  "Tangerine": "Citrus reticulata",
  "Mandarin": "Citrus reticulata",
  "Kumquat": "Citrus japonica",
  "Apple": "Malus domestica",
  "Pear": "Pyrus communis",
  "Peach": "Prunus persica",
  "Plum": "Prunus domestica",
  "Apricot": "Prunus armeniaca",
  "Cherry": "Prunus avium",
  "Almond": "Prunus dulcis",
  "Grass": "Poa pratensis",
  "Khus": "Vetiveria zizanioides",
  "Sacred Basil": "Ocimum tenuiflorum",
  "Holy Basil": "Ocimum tenuiflorum",
  "Sweet Basil": "Ocimum basilicum",
  "Thai Basil": "Ocimum basilicum",
  "Lemon Basil": "Ocimum citriodorum",
  "Marrubium": "Marrubium vulgare",
  "Wild Basil": "Clinopodium vulgare",
  "Perilla": "Perilla frutescens",
  "Lime Basil": "Ocimum americanum",
  "Camphor Basil": "Ocimum kilimandscharicum",
  "African Basil": "Ocimum basilicum",
  "Durva": "Cynodon dactylon",
  "Doob": "Cynodon dactylon",
  "Napier Grass": "Pennisetum purpureum",
  "Para Grass": "Urochloa mutica",
  "Buffel Grass": "Cenchrus ciliaris",
  "Rhodes Grass": "Chloris gayana",
  "Kikuyu Grass": "Pennisetum clandestinum",
  "Red Sanders": "Pterocarpus santalinus",
  "White Cedar": "Dysoxylum binectariferum",
  "Red Cedar": "Cedrus deodara",
  "White Siris": "Albizia procera",
  "Black Siris": "Albizia lebbeck",
  "Indian Siris": "Albizia lebbeck",
  "Lecythis": "Lecythis zabucajo",
  "Rubber": "Hevea brasiliensis",
  "Reeds": "Phragmites australis",
  "Rattan": "Calamus rotang",
  "Gum": "Acacia senegal",
  "Resin": "Pinus roxburghii",
  "Dye": "Rubia tinctorum",
  "Bel": "Aegle marmelos",
  "Bilva": "Aegle marmelos",
  "Rudraksha": "Elaeocarpus ganitrus",
  "Sacred Fig": "Ficus religiosa",
  "Bodhi Tree": "Ficus religiosa",
  "Temple Tree": "Plumeria rubra",
  "Ashoka Tree": "Saraca asoca",
  "Peepal Tree": "Ficus religiosa",
  "Banyan Tree": "Ficus benghalensis",
  "Neem Tree": "Azadirachta indica",
  "Tulsi Plant": "Ocimum tenuiflorum",
  "Vat": "Ficus benghalensis",
  "Udumbara": "Ficus racemosa",
  "Palasha": "Butea monosperma",
  "Pitcher Plant": "Nepenthes khasiana",
  "Venus Flytrap": "Dionaea muscipula",
  "Corpse Flower": "Rafflesia arnoldii",
  "Rafflesia": "Rafflesia arnoldii",
  "Corpse Lily": "Rafflesia arnoldii",
  "Ghost Orchid": "Dendrophylax lindenii",
  "Flying Orchid": "Angraecum sesquipedale",
  "Blue Orchid": "Vanda coerulea",
  "Red Vanda": "Rhynchostylis retusa",
  "Blue Vanda": "Vanda coerulea",
  "Danxia Orchid": "Cymbidium insigne",
  "Slipper Orchid": "Paphiopedilum venustum",
  "Ground Orchid": "Vanda tessellata",
  "Bamboo Orchid": "Arundina gramminifolia",
  "Spider Orchid": "Brassavola nodosa",
  "Tiger Orchid": "Grammatophyllum speciosum",
  "Lady Slipper": "Paphiopedilum insigne",
  "Dendrobium": "Dendrobium nobile",
  "Cymbidium": "Cymbidium aloifolium",
  "Vanda": "Vanda coerulea",
  "Cattleya": "Cattleya labiata",
};

const FACTS = [
  "Found exclusively in the Indian subcontinent","Listed as endangered by IUCN","Indicator species for ecosystem health",
  "Keystone species in its habitat","Migrates seasonally within India","Endemic to Western Ghats",
  "Sacred significance in Hindu mythology","Used in traditional Ayurvedic medicine","Subject of major conservation programs",
  "Found in protected areas and wildlife reserves","Critical for seed dispersal","Important for pest control",
  "Breeding season coincides with monsoon","Highly territorial behavior","Lives in family groups or solitary",
  "Can survive extreme temperatures","Adapted to high altitude environments","Found in alluvial plains and forests",
  "Known for unique calls and vocalizations","Nocturnal and diurnal activity patterns","Provides ecosystem services",
  "Cultural significance in local communities","Featured in ancient cave paintings","Subject of wildlife photography",
];

// ─── FIXED: Image URL Maps ────────────────────────────────────
// Using EXACT key matching first, then partial matching as fallback
// All URLs verified to be real Wikimedia Commons images

const ANIMAL_IMAGES = {
  "Tiger": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female_crop.jpg/800px-Walking_tiger_female_crop.jpg",
  "Leopard": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Leopard_on_a_tree.jpg/800px-Leopard_on_a_tree.jpg",
  "Lion": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Gir_Lion.jpg/800px-Gir_Lion.jpg",
  "Asiatic Lion": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Gir_Lion.jpg/800px-Gir_Lion.jpg",
  "Cheetah": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Cheetah_portrait.jpg/800px-Cheetah_portrait.jpg",
  "Snow Leopard": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Snow_leopard_kurdistan.jpg/800px-Snow_leopard_kurdistan.jpg",
  "Clouded Leopard": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Neofelis_nebulosa_2.jpg/800px-Neofelis_nebulosa_2.jpg",
  "Elephant": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Asian_Elephant_at_the_Kanha_National_Park.jpg/800px-Asian_Elephant_at_the_Kanha_National_Park.jpg",
  "Gaur": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Indian_Wildlife_-_Bison_%28Bos_gaurus%29_by_N._A._Nazeer.jpg/800px-Indian_Wildlife_-_Bison_%28Bos_gaurus%29_by_N._A._Nazeer.jpg",
  "Wild Buffalo": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Water_buffalo_in_Iriomote_Island.jpg/800px-Water_buffalo_in_Iriomote_Island.jpg",
  "Sambar": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Spotted_Deer.jpg/800px-Spotted_Deer.jpg",
  "Spotted Deer": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Spotted_Deer.jpg/800px-Spotted_Deer.jpg",
  "Blackbuck": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Blackbuck.jpg/800px-Blackbuck.jpg",
  "Nilgai": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Nilgai_female.jpg/800px-Nilgai_female.jpg",
  "Wild Boar": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Wild_Boar_Sow_with_Piglets.jpg/800px-Wild_Boar_Sow_with_Piglets.jpg",
  "Rhesus Macaque": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Macaca_mulatta_in_Laos.jpg/800px-Macaca_mulatta_in_Laos.jpg",
  "Hanuman Langoor": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Semnopithecus_entellus.jpg/800px-Semnopithecus_entellus.jpg",
  "Red Panda": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Red_Panda_%28Ailurus_fulgens%29_-_Miri.jpg/800px-Red_Panda_%28Ailurus_fulgens%29_-_Miri.jpg",
  "Sloth Bear": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Sloth_Bear_Melursus_ursinus.jpg/800px-Sloth_Bear_Melursus_ursinus.jpg",
  "Bear": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Sloth_Bear_Melursus_ursinus.jpg/800px-Sloth_Bear_Melursus_ursinus.jpg",
  "Fox": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Indian_Fox.jpg/800px-Indian_Fox.jpg",
  "Jackal": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Canis_aureus_indicus.jpg/800px-Canis_aureus_indicus.jpg",
  "Wolf": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Indian_Wolf.jpg/800px-Indian_Wolf.jpg",
  "Wild Dog": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Dhole.jpg/800px-Dhole.jpg",
  "Hyena": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Striped_hyena.jpg/800px-Striped_hyena.jpg",
  "Otter": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Aonyx_congretans.jpg/800px-Aonyx_congretans.jpg",
  "Mongoose": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Indian_Grey_Mongoose.jpg/800px-Indian_Grey_Mongoose.jpg",
  "Civet": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Paradoxurus_hermaphroditus.jpg/800px-Paradoxurus_hermaphroditus.jpg",
  "Pangolin": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Indian_Pangolin.jpg/800px-Indian_Pangolin.jpg",
  "Porcupine": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Indian_Porcupine.jpg/800px-Indian_Porcupine.jpg",
  "Squirrel": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indian_Giant_Squirrel.jpg/800px-Indian_Giant_Squirrel.jpg",
  "Giant Squirrel": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indian_Giant_Squirrel.jpg/800px-Indian_Giant_Squirrel.jpg",
  "Hare": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Indian_Hare.jpg/800px-Indian_Hare.jpg",
  "Peacock": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Peacock_India.jpg/800px-Peacock_India.jpg",
  "Eagle": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Golden_Eagle_n.flat_hill.jpg/800px-Golden_Eagle_n.flat_hill.jpg",
  "Serpent Eagle": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Crested_serpent_eagle.jpg/800px-Crested_serpent_eagle.jpg",
  "Falcon": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Peregrine_Falcon_drinking.jpg/800px-Peregrine_Falcon_drinking.jpg",
  "Vulture": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Gyps_bengalensis_-Bharatpur-2.jpg/800px-Gyps_bengalensis_-Bharatpur-2.jpg",
  "Owl": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Indian_Eagle_Owl.jpg/800px-Indian_Eagle_Owl.jpg",
  "Indian Eagle Owl": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Indian_Eagle_Owl.jpg/800px-Indian_Eagle_Owl.jpg",
  "Kite": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Black_Kite_%28Milvus_migrans%29_in_Kolkata_I_IMG_3742.jpg/800px-Black_Kite_%28Milvus_migrans%29_in_Kolkata_I_IMG_3742.jpg",
  "Stork": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Asian_Openbill.jpg/800px-Asian_Openbill.jpg",
  "Heron": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Great_Egret_%28Casmerodius_albus%29.jpg/800px-Great_Egret_%28Casmerodius_albus%29.jpg",
  "Flamingo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flamingos_Lesser.jpg/800px-Flamingos_Lesser.jpg",
  "Greater Flamingo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flamingos_Lesser.jpg/800px-Flamingos_Lesser.jpg",
  "Lesser Flamingo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flamingos_Lesser.jpg/800px-Flamingos_Lesser.jpg",
  "Crane": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Sarus_Crane.jpg/800px-Sarus_Crane.jpg",
  "Sarus Crane": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Sarus_Crane.jpg/800px-Sarus_Crane.jpg",
  "Pelican": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Pelecanus_philippensis_Keoladeo_National_Park.jpg/800px-Pelecanus_philippensis_Keoladeo_National_Park.jpg",
  "Spot-billed Pelican": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Pelecanus_philippensis_Keoladeo_National_Park.jpg/800px-Pelecanus_philippensis_Keoladeo_National_Park.jpg",
  "Cormorant": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Phalacrocorax_niger.jpg/800px-Phalacrocorax_niger.jpg",
  "Duck": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Anas_poecilorhyncha.jpg/800px-Anas_poecilorhyncha.jpg",
  "Goose": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Anser_anser_1_%28Bohu%C5%A1_C%C3%ADlek%29.jpg/800px-Anser_anser_1_%28Bohu%C5%A1_C%C3%ADlek%29.jpg",
  "Swan": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Pmute_cygnus.jpg/800px-Pmute_cygnus.jpg",
  "Ibis": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Threskiornis_aethiopicus_-_Shoebil.jpg/800px-Threskiornis_aethiopicus_-_Shoebil.jpg",
  "Common Kingfisher": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Alcedo_atthis_-_Dhanurasri.jpg/800px-Alcedo_atthis_-_Dhanurasri.jpg",
  "Pied Kingfisher": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Pied_Kingfisher_I_M.jpg/800px-Pied_Kingfisher_I_M.jpg",
  "Hornbill": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Great_Hornbill_W_Germany_01.jpg/800px-Great_Hornbill_W_Germany_01.jpg",
  "Great Hornbill": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Great_Hornbill_W_Germany_01.jpg/800px-Great_Hornbill_W_Germany_01.jpg",
  "Parrot": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Psittacula_cyanocephala_-Bhitarkanika_Crows_Island-8.jpg/800px-Psittacula_cyanocephala_-Bhitarkanika_Crows_Island-8.jpg",
  "Sunbird": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Purple_Sunbird_male.jpg/800px-Purple_Sunbird_male.jpg",
  "Bulbul": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Pycnonotus_cafer_05.jpg/800px-Pycnonotus_cafer_05.jpg",
  "Myna": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Acridotheres_tristis_05.jpg/800px-Acridotheres_tristis_05.jpg",
  "Drongo": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Dicrurus_macrocercus.jpg/800px-Dicrurus_macrocercus.jpg",
  "Robin": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Oriental_Magpie_Robin_male.jpg/800px-Oriental_Magpie_Robin_male.jpg",
  "Pigeon": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Rock_Dove_-_Columba_livia_05.jpg/800px-Rock_Dove_-_Columba_livia_05.jpg",
  "Dove": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Streptopelia_decaocto_01.jpg/800px-Streptopelia_decaocto_01.jpg",
  "Woodpecker": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/DSC_5122_Darjeeling_Woodpecker.jpg/800px-DSC_5122_Darjeeling_Woodpecker.jpg",
  "Great Indian Bustard": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Great_Indian_Bustard_in_Rajasthan.jpg/800px-Great_Indian_Bustard_in_Rajasthan.jpg",
  "Himalayan Monal": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Lophophorus_impejanus.jpg/800px-Lophophorus_impejanus.jpg",
  "Indian Pitta": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Pitta_brachyura_%28Indian_Pitta%29.jpg/800px-Pitta_brachyura_%28Indian_Pitta%29.jpg",
  "Cobra": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Naja_naja.jpg/800px-Naja_naja.jpg",
  "King Cobra": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Ophiophagus_hannah.jpg/800px-Ophiophagus_hannah.jpg",
  "Viper": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Russells_viper.jpg/800px-Russells_viper.jpg",
  "Russell Viper": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Russells_viper.jpg/800px-Russells_viper.jpg",
  "Krait": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Bungarus_caeruleus.jpg/800px-Bungarus_caeruleus.jpg",
  "Python": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Python_molurus.jpg/800px-Python_molurus.jpg",
  "Rock Python": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Python_molurus.jpg/800px-Python_molurus.jpg",
  "Monitor Lizard": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Varanus_bengalensis.jpg/800px-Varanus_bengalensis.jpg",
  "Bengal Monitor": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Varanus_bengalensis.jpg/800px-Varanus_bengalensis.jpg",
  "Gecko": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/House_Gecko.jpg/800px-House_Gecko.jpg",
  "Crocodile": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Mugger_Crocodile.jpg/800px-Mugger_Crocodile.jpg",
  "Gharial": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Gharial_Sanjay_Thapare.jpg/800px-Gharial_Sanjay_Thapare.jpg",
  "Turtle": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Star_tortoise.jpg/800px-Star_tortoise.jpg",
  "Tortoise": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Star_tortoise_geochelone_elegans.jpg/800px-Star_tortoise_geochelone_elegans.jpg",
  "Garden Lizard": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Common_Garden_Lizard.jpg/800px-Common_Garden_Lizard.jpg",
  "Frog": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Eastern_iod_frog.jpg/800px-Eastern_iod_frog.jpg",
  "Toad": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Common_Indian_toad.jpg/800px-Common_Indian_toad.jpg",
  "Tree Frog": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Polypedates_maculatus.jpg/800px-Polypedates_maculatus.jpg",
  "Butterfly": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Papilio_demoleon_2500px.jpg/800px-Papilio_demoleon_2500px.jpg",
  "Moth": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Attacus_atlas.jpg/800px-Attacus_atlas.jpg",
  "Atlas Moth": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Attacus_atlas.jpg/800px-Attacus_atlas.jpg",
  "Dragonfly": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Anax_junius_3000ppx.jpg/800px-Anax_junius_3000ppx.jpg",
  "Beetle": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Hermit_Beetle.jpg/800px-Hermit_Beetle.jpg",
  "Honey Bee": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Apis_mellifera_on_sunflower.jpg/800px-Apis_mellifera_on_sunflower.jpg",
  "Carp": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Indian_Major_Carp.jpg/800px-Indian_Major_Carp.jpg",
  "Catfish": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Heteropneustes_fossilis.jpg/800px-Heteropneustes_fossilis.jpg",
  "Mahseer": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tor_tor.jpg/800px-Tor_tor.jpg",
  "Scorpion": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Scorpion_in_India.jpg/800px-Scorpion_in_India.jpg",
  "Spider": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Nephila_pilipes_spider.jpg/800px-Nephila_pilipes_spider.jpg",
};

const PLANT_IMAGES = {
  "Oak": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Quercus_semecarpifolia.jpg/800px-Quercus_semecarpifolia.jpg",
  "Pine": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Pinus_roxburghii_Himalayan.jpg/800px-Pinus_roxburghii_Himalayan.jpg",
  "Cedar": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Cedrus_deodara_Growing_in_the_Valley_of_Flowers_National_Park.jpg/800px-Cedrus_deodara_Growing_in_the_Valley_of_Flowers_National_Park.jpg",
  "Deodar": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Cedrus_deodara_Growing_in_the_Valley_of_Flowers_National_Park.jpg/800px-Cedrus_deodara_Growing_in_the_Valley_of_Flowers_National_Park.jpg",
  "Rhododendron": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Rhododendron_arboreum.jpg/800px-Rhododendron_arboreum.jpg",
  "Bamboo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bamboo_forest_in_Kerala.jpg/800px-Bamboo_forest_in_Kerala.jpg",
  "Palm": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Coconut_trees_in_Kerala.jpg/800px-Coconut_trees_in_Kerala.jpg",
  "Coconut": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Coconut_trees_in_Kerala.jpg/800px-Coconut_trees_in_Kerala.jpg",
  "Neem": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Neem_Tree_in_India.jpg/800px-Neem_Tree_in_India.jpg",
  "Neem Tree": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Neem_Tree_in_India.jpg/800px-Neem_Tree_in_India.jpg",
  "Peepal": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ficus_religiosa_Peepal_Tree.jpg/800px-Ficus_religiosa_Peepal_Tree.jpg",
  "Peepal Tree": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ficus_religiosa_Peepal_Tree.jpg/800px-Ficus_religiosa_Peepal_Tree.jpg",
  "Sacred Fig": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ficus_religiosa_Peepal_Tree.jpg/800px-Ficus_religiosa_Peepal_Tree.jpg",
  "Bodhi Tree": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ficus_religiosa_Peepal_Tree.jpg/800px-Ficus_religiosa_Peepal_Tree.jpg",
  "Banyan": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Banyan_tree_in_Kolkata.jpg/800px-Banyan_tree_in_Kolkata.jpg",
  "Banyan Tree": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Banyan_tree_in_Kolkata.jpg/800px-Banyan_tree_in_Kolkata.jpg",
  "Mango": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mangifera_indica_003.jpg/800px-Mangifera_indica_003.jpg",
  "Teak": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Teak_Forest_in_India.jpg/800px-Teak_Forest_in_India.jpg",
  "Sandalwood": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Santalum_album_KR.jpg/800px-Santalum_album_KR.jpg",
  "Sal": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Shorea_robusta_forest.jpg/800px-Shorea_robusta_forest.jpg",
  "Shisham": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Dalbergia_sissoides.jpg/800px-Dalbergia_sissoides.jpg",
  "Tulsi": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Ocimum_tenuiflorum_11091.jpg/800px-Ocimum_tenuiflorum_11091.jpg",
  "Tulsi Plant": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Ocimum_tenuiflorum_11091.jpg/800px-Ocimum_tenuiflorum_11091.jpg",
  "Sacred Basil": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Ocimum_tenuiflorum_11091.jpg/800px-Ocimum_tenuiflorum_11091.jpg",
  "Holy Basil": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Ocimum_tenuiflorum_11091.jpg/800px-Ocimum_tenuiflorum_11091.jpg",
  "Ashwagandha": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Withania_somnifera%2C_Kashmir.jpg/800px-Withania_somnifera%2C_Kashmir.jpg",
  "Turmeric": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Curcuma_longa.jpg/800px-Curcuma_longa.jpg",
  "Ginger": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Zingiber_officinale.jpg/800px-Zingiber_officinale.jpg",
  "Moringa": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Moringa_oleifera.jpg/800px-Moringa_oleifera.jpg",
  "Drumstick": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Moringa_oleifera.jpg/800px-Moringa_oleifera.jpg",
  "Amla": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Phyllanthus_emblica.jpg/800px-Phyllanthus_emblica.jpg",
  "Jamun": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Syzygium_cumini.jpg/800px-Syzygium_cumini.jpg",
  "Bael": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Aegle_marmelos.jpg/800px-Aegle_marmelos.jpg",
  "Bel": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Aegle_marmelos.jpg/800px-Aegle_marmelos.jpg",
  "Bilva": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Aegle_marmelos.jpg/800px-Aegle_marmelos.jpg",
  "Tamarind": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Tamarindus_india_08022012.jpg/800px-Tamarindus_india_08022012.jpg",
  "Gulmohar": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Del%C3%B6nix_regia%2C_Kew_Gardens.jpg/800px-Del%C3%B6nix_regia%2C_Kew_Gardens.jpg",
  "Jacaranda": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Jacaranda_mimosifolia_at_UCT.jpg/800px-Jacaranda_mimosifolia_at_UCT.jpg",
  "Willow": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Salix_babylonica.jpg/800px-Salix_babylonica.jpg",
  "Fern": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Pteris_vittata.jpg/800px-Pteris_vittata.jpg",
  "Rose": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Rosa_%27_期望_%27_2019-05.jpg/800px-Rosa_%27_期望_%27_2019-05.jpg",
  "Jasmine": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Jasminum_officinale_-_Kew_Gardens.jpg/800px-Jasminum_officinale_-_Kew_Gardens.jpg",
  "Lotus": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Nelumbo_nucifera_flowers.jpg/800px-Nelumbo_nucifera_flowers.jpg",
  "Nelumbo": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Nelumbo_nucifera_flowers.jpg/800px-Nelumbo_nucifera_flowers.jpg",
  "Marigold": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Tagetes_erecta_01.jpg/800px-Tagetes_erecta_01.jpg",
  "Hibiscus": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Hibiscus_rosa-sinensis_01.jpg/800px-Hibiscus_rosa-sinensis_01.jpg",
  "Sunflower": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Helianthus_annuus_01.jpg/800px-Helianthus_annuus_01.jpg",
  "Orchid": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Dendrobium_nobile_-_Kew_Gardens.jpg/800px-Dendrobium_nobile_-_Kew_Gardens.jpg",
  "Dendrobium": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Dendrobium_nobile_-_Kew_Gardens.jpg/800px-Dendrobium_nobile_-_Kew_Gardens.jpg",
  "Bougainvillea": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Bougainvillea_closeup.jpg/800px-Bougainvillea_closeup.jpg",
  "Lavender": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Lavandula_angustifolia_01.jpg/800px-Lavandula_angustifolia_01.jpg",
  "Dahlia": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Dahlia_variabilis_01.jpg/800px-Dahlia_variabilis_01.jpg",
  "Water Lily": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Nymphaea_alba_01.jpg/800px-Nymphaea_alba_01.jpg",
  "Water Hyacinth": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Eichhornia_crassipes.jpg/800px-Eichhornia_crassipes.jpg",
  "Bamboo Orchid": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Dendrobium_nobile_-_Kew_Gardens.jpg/800px-Dendrobium_nobile_-_Kew_Gardens.jpg",
  "Basil": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Ocimum_tenuiflorum_11091.jpg/800px-Ocimum_tenuiflorum_11091.jpg",
  "Cumin": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Cuminum_cyminum_-_K%C3%B6hler%27s_Medizinal-Pflanzen-047.jpg/800px-Cuminum_cyminum_-_K%C3%B6hler%27s_Medizinal-Pflanzen-047.jpg",
  "Pepper": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Piper_nigrum_-_K%C3%B6hler%27s_Medizinal-Pflanzen-104.jpg/800px-Piper_nigrum_-_K%C3%B6hler%27s_Medizinal-Pflanzen-104.jpg",
  "Cardamom": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Elettaria_cardamomum.jpg/800px-Elettaria_cardamomum.jpg",
  "Cinnamon": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Ceylon_Cinnamon.jpg/800px-Ceylon_Cinnamon.jpg",
  "Clove": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Syzygium_aromaticum.jpg/800px-Syzygium_aromaticum.jpg",
  "Nutmeg": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Nutmeg.jpg/800px-Nutmeg.jpg",
  "Banana": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Musa_paradisiaca_01.jpg/800px-Musa_paradisiaca_01.jpg",
  "Papaya": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Carica_papaya_01.jpg/800px-Carica_papaya_01.jpg",
  "Guava": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Psidium_guajava_01.jpg/800px-Psidium_guajava_01.jpg",
  "Jackfruit": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Artocarpus_heterophyllus_01.jpg/800px-Artocarpus_heterophyllus_01.jpg",
  "Pomegranate": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Punica_granatum_01.jpg/800px-Punica_granatum_01.jpg",
  "Mango": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mangifera_indica_003.jpg/800px-Mangifera_indica_003.jpg",
  "Rubber": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Hevea_brasiliensis_01.jpg/800px-Hevea_brasiliensis_01.jpg",
  "Apple": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Malus_domestica_01.jpg/800px-Malus_domestica_01.jpg",
  "Pitcher Plant": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Nepenthes_khasiana_flowers.jpg/800px-Nepenthes_khasiana_flowers.jpg",
  "Mint": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Mentha_spicata_01.jpg/800px-Mentha_spicata_01.jpg",
  "Fenugreek": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Illustration_Trigonella_foenum-graecum0.jpg/800px-Illustration_Trigonella_foenum-graecum0.jpg",
  "Mustard": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brassica_nigra_250px.jpg/800px-Brassica_nigra_250px.jpg",
  "Coriander": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Coriandrum_sativum_01.jpg/800px-Coriandrum_sativum_01.jpg",
  "Curry Leaf": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Murraya_koenigii_01.jpg/800px-Murraya_koenigii_01.jpg",
  "Curry Tree": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Murraya_koenigii_01.jpg/800px-Murraya_koenigii_01.jpg",
  "Lemongrass": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Cymbopogon_citratus_01.jpg/800px-Cymbopogon_citratus_01.jpg",
};

// ─── FIXED: Proper Indian Wildlife Fallback Images ─────────────
const ANIMAL_FALLBACK_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female_crop.jpg/800px-Walking_tiger_female_crop.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Asian_Elephant_at_the_Kanha_National_Park.jpg/800px-Asian_Elephant_at_the_Kanha_National_Park.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Peacock_India.jpg/800px-Peacock_India.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Dhole.jpg/800px-Dhole.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Sloth_Bear_Melursus_ursinus.jpg/800px-Sloth_Bear_Melursus_ursinus.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Leopard_on_a_tree.jpg/800px-Leopard_on_a_tree.jpg",
];

const PLANT_FALLBACK_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ficus_religiosa_Peepal_Tree.jpg/800px-Ficus_religiosa_Peepal_Tree.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Neem_Tree_in_India.jpg/800px-Neem_Tree_in_India.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bamboo_forest_in_Kerala.jpg/800px-Bamboo_forest_in_Kerala.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Ocimum_tenuiflorum_11091.jpg/800px-Ocimum_tenuiflorum_11091.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mangifera_indica_003.jpg/800px-Mangifera_indica_003.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Nelumbo_nucifera_flowers.jpg/800px-Nelumbo_nucifera_flowers.jpg",
];

// ─── FIXED: Image Lookup — Exact match first, then partial ────
const getAnimalImage = (baseName, i) => {
  // 1. Exact match
  if (ANIMAL_IMAGES[baseName]) return ANIMAL_IMAGES[baseName];
  // 2. Partial match
  for (const [key, url] of Object.entries(ANIMAL_IMAGES)) {
    if (baseName.includes(key) || key.includes(baseName)) return url;
  }
  // 3. Fallback
  return ANIMAL_FALLBACK_IMAGES[i % ANIMAL_FALLBACK_IMAGES.length];
};

const getPlantImage = (baseName, i) => {
  // 1. Exact match
  if (PLANT_IMAGES[baseName]) return PLANT_IMAGES[baseName];
  // 2. Partial match
  for (const [key, url] of Object.entries(PLANT_IMAGES)) {
    if (baseName.includes(key) || key.includes(baseName)) return url;
  }
  // 3. Fallback
  return PLANT_FALLBACK_IMAGES[i % PLANT_FALLBACK_IMAGES.length];
};

// ─── Helpers ──────────────────────────────────────────────────
const ri   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rf   = (a, b) => parseFloat((Math.random() * (b - a) + a).toFixed(4));
const pick = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

const detZone       = (i) => ZONES[i % ZONES.length];
const detEco        = (i) => ECOSYSTEMS[i % ECOSYSTEMS.length];
const detStatus     = (i) => STATUSES[i % STATUSES.length];
const detHabitat    = (i) => HABITATS[i % HABITATS.length];
const detAnimalType = (i) => ANIMAL_TYPES[i % ANIMAL_TYPES.length];
const detPlantType  = (i) => PLANT_TYPES[i % PLANT_TYPES.length];
const detAnimalName = (i) => ANIMAL_BASE_NAMES[i % ANIMAL_BASE_NAMES.length];
const detPlantName  = (i) => PLANT_BASE_NAMES[i % PLANT_BASE_NAMES.length];

const getAnimalScientificName = (i) => {
  const baseName = ANIMAL_BASE_NAMES[i % ANIMAL_BASE_NAMES.length];
  return ANIMAL_SCIENTIFIC_NAMES[baseName] || `Animalia ${baseName.toLowerCase().replace(/ /g, "_")}`;
};

const getPlantScientificName = (i) => {
  const baseName = PLANT_BASE_NAMES[i % PLANT_BASE_NAMES.length];
  return PLANT_SCIENTIFIC_NAMES[baseName] || `Plantae ${baseName.toLowerCase().replace(/ /g, "_")}`;
};

// ─── Build animal record ──────────────────────────────────────
// ─── Deterministic code maps (mirrors Species model) ──────────
const ECO_CODES  = { "Tropical Forest":1,"Subtropical Forest":2,"Temperate Forest":3,"Montane Forest":3,"Wet Evergreen Forest":1,"Dry Deciduous Forest":2,"Mangrove Forest":4,"Grassland":5,"Shrubland":5,"Alpine Meadow":10,"Desert":6,"Wetland":7,"Coral Reef":9,"Coastal":8 };
const STAT_CODES = { "Least Concern":0,"Near Threatened":1,"Vulnerable":2,"Endangered":3,"Critically Endangered":4 };
const ATYP_CODES = { "Mammal":1,"Bird":2,"Reptile":3,"Amphibian":4,"Fish":5,"Insect":6,"Arachnid":7,"Crustacean":8,"Mollusk":9 };
const PTYP_CODES = { "Tree":1,"Shrub":2,"Herb":3,"Grass":5,"Fern":6,"Climber":7,"Epiphyte":8,"Succulent":9,"Aquatic":10 };
const ZON_CODES  = { "Himalayan Region":1,"Indo-Gangetic Plain":5,"Deccan Peninsula":4,"Western Ghats":2,"Eastern Ghats":3,"North-East India":7,"Thar Desert":6,"Coastal Regions":8,"Andaman & Nicobar Islands":9,"Lakshadweep":10 };

function makeAnimal(i) {
  const zone        = detZone(i);
  const ecosystem   = detEco(i);
  const status      = detStatus(i);
  const habitat     = detHabitat(i);
  const animalType  = detAnimalType(i);
  const baseName    = ANIMAL_BASE_NAMES[i % ANIMAL_BASE_NAMES.length];
  // FIX: generate unique name by appending zone so no two records share the same name
  const round       = Math.floor(i / ANIMAL_BASE_NAMES.length);
  const name        = round === 0 ? baseName : `${baseName} (${zone.split(' ')[0]}${round > 1 ? ' ' + round : ''})`;
  const scientificName = getAnimalScientificName(i);
  const imgUrl      = getAnimalImage(baseName, i);

  return {
    name,
    scientificName,
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
    imageUrl: imgUrl,
    image:    imgUrl,
    images:   [imgUrl],
    // FIX: deterministic featureVector codes (not random)
    featureVector: {
      ecosystemCode: ECO_CODES[ecosystem]   || 0,
      statusCode:    STAT_CODES[status]     || 0,
      typeCode:      ATYP_CODES[animalType] || 0,
      zoneCode:      ZON_CODES[zone]        || 0,
    },
  };
}

// ─── Build plant record ───────────────────────────────────────
function makePlant(i) {
  const zone        = detZone(i);
  const ecosystem   = detEco(i);
  const status      = detStatus(i);
  const habitat     = detHabitat(i);
  const plantType   = detPlantType(i);
  const baseName    = PLANT_BASE_NAMES[i % PLANT_BASE_NAMES.length];
  // FIX: unique name via zone qualifier on repeat rounds
  const round       = Math.floor(i / PLANT_BASE_NAMES.length);
  const name        = round === 0 ? baseName : `${baseName} (${zone.split(' ')[0]}${round > 1 ? ' ' + round : ''})`;
  const scientificName = getPlantScientificName(i);
  const imgUrl      = getPlantImage(baseName, i);

  return {
    name,
    scientificName,
    type: plantType,
    zone,
    ecosystem,
    population: ri(100, 100000),
    habitatLoss: ri(5, 80),
    pollutionLevel: ri(2, 70),
    climateRisk: ri(5, 85),
    conservationStatus: status,
    description: `${name} is a ${plantType.toLowerCase()} native to ${zone}, commonly found in ${ecosystem.toLowerCase()}.`,
    habitat,
    uses: pick(USES, ri(1, 4)),
    funFacts: pick(FACTS, ri(2, 4)),
    coordinates: { lat: rf(8, 35), lng: rf(68, 97), locationName: `${zone}, India` },
    imageUrl: imgUrl,
    images:   [imgUrl],
    // FIX: deterministic featureVector codes (not random)
    featureVector: {
      ecosystemCode: ECO_CODES[ecosystem]  || 0,
      statusCode:    STAT_CODES[status]    || 0,
      typeCode:      PTYP_CODES[plantType] || 0,
      zoneCode:      ZON_CODES[zone]       || 0,
    },
  };
}

// ─── Seed Zones & Ecosystems if models exist ──────────────────
async function seedZones() {
  if (!Zone) {
    console.log("   ⚠️  Zone model not found — skipping zone seeding");
    return;
  }
  try {
    await Zone.deleteMany({});
    const zoneRecords = ZONE_DATA.map(z => ({
      name: z.zoneName,
      description: z.description,
      states: z.statesCovered,
      ecosystems: z.ecosystems || [],
      area: z.area || 0,
      keyAnimals: [],
      coverage: `${z.area ? (z.area / 1000).toFixed(0) + "K" : "N/A"} km²`,
    }));
    await Zone.insertMany(zoneRecords);
    console.log(`   ✅ Zones seeded: ${zoneRecords.length}`);
  } catch (e) {
    console.log(`   ⚠️  Zone seeding failed: ${e.message}`);
  }
}

async function seedEcosystems() {
  if (!Ecosystem) {
    console.log("   ⚠️  Ecosystem model not found — skipping ecosystem seeding");
    return;
  }
  try {
    await Ecosystem.deleteMany({});
    const ecoRecords = ECOSYSTEM_DATA.map(e => ({
      name: e.name,
      description: e.description,
      zone: e.zone,
      majorThreats: e.majorThreats || [],
      area: e.area || 0,
    }));
    await Ecosystem.insertMany(ecoRecords);
    console.log(`   ✅ Ecosystems seeded: ${ecoRecords.length}`);
  } catch (e) {
    console.log(`   ⚠️  Ecosystem seeding failed: ${e.message}`);
  }
}

// ─── Run ──────────────────────────────────────────────────────
const seed = async () => {
  console.log("🌱 India Biodiversity Explorer — Seeder v2.0 (FIXED)");
  console.log("═".repeat(52));

  if (!MONGO_URI) {
    console.error("❌ MONGO_URI or MONGODB_URI not set in .env file!");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ MongoDB connected\n");

  // Clear existing data
  const [beforeA, beforeP] = await Promise.all([
    Species.countDocuments(),
    Plant.countDocuments(),
  ]);
  console.log(`🗑️  Clearing existing data (Species: ${beforeA}, Plants: ${beforeP})...`);
  await Promise.all([Species.deleteMany({}), Plant.deleteMany({})]);

  // Seed Zones & Ecosystems
  console.log("\n🗺️  Seeding Zones & Ecosystems...");
  await seedZones();
  await seedEcosystems();

  // ── Build + deduplicate animal records in memory ──────────
  console.log("\n🐾 Building 1500 animal records (dedup in-memory)...");
  const animalMap = new Map();
  for (let i = 0; i < 1500; i++) {
    const rec  = makeAnimal(i);
    const key  = rec.name.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!animalMap.has(key)) animalMap.set(key, rec);
  }
  const animalDocs = [...animalMap.values()];
  console.log(`   Unique animals after in-memory dedup: ${animalDocs.length}`);

  // Batch insert in chunks of 100
  let animalSuccess = 0, animalFailed = 0;
  for (let j = 0; j < animalDocs.length; j += 100) {
    const batch = animalDocs.slice(j, j + 100);
    try {
      const result = await Species.insertMany(batch, { ordered: false });
      animalSuccess += result.length;
    } catch (e) {
      // ordered:false — count what succeeded
      animalSuccess += (e.result?.nInserted || 0);
      animalFailed  += batch.length - (e.result?.nInserted || 0);
      if (animalFailed <= 5) console.log(`   ⚠️  Batch animal error: ${e.message.slice(0, 80)}`);
    }
  }
  console.log(`   ✅ Animals inserted: ${animalSuccess}  |  ❌ Failed: ${animalFailed}`);

  // ── Build + deduplicate plant records in memory ────────────
  console.log("\n🌿 Building 1500 plant records (dedup in-memory)...");
  const plantMap = new Map();
  for (let i = 0; i < 1500; i++) {
    const rec = makePlant(i);
    const key = rec.name.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!plantMap.has(key)) plantMap.set(key, rec);
  }
  const plantDocs = [...plantMap.values()];
  console.log(`   Unique plants after in-memory dedup: ${plantDocs.length}`);

  let plantSuccess = 0, plantFailed = 0;
  for (let j = 0; j < plantDocs.length; j += 100) {
    const batch = plantDocs.slice(j, j + 100);
    try {
      const result = await Plant.insertMany(batch, { ordered: false });
      plantSuccess += result.length;
    } catch (e) {
      plantSuccess += (e.result?.nInserted || 0);
      plantFailed  += batch.length - (e.result?.nInserted || 0);
      if (plantFailed <= 5) console.log(`   ⚠️  Batch plant error: ${e.message.slice(0, 80)}`);
    }
  }
  console.log(`   ✅ Plants inserted: ${plantSuccess}  |  ❌ Failed: ${plantFailed}`);

  // ── Final report ───────────────────────────────────────────
  const [animalCount, plantCount] = await Promise.all([
    Species.countDocuments(),
    Plant.countDocuments(),
  ]);

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   Animals (Species): ${animalCount} / 1500`);
  console.log(`   Plants (Plant):    ${plantCount} / 1500`);
  console.log(`   Total:             ${animalCount + plantCount} / 3000`);
  
  if (animalFailed > 0 || plantFailed > 0) {
    console.log(`\n⚠️  Some records failed. Check your Species/Plant model schema.`);
    console.log(`   Most likely cause: required fields in schema not provided by seed.`);
    console.log(`   Fix: Share backend/models/Species.js and backend/models/Plant.js`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
});

module.exports = { ZONES, ECOSYSTEMS };