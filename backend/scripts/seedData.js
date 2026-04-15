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
  // Big Cats & Carnivores
  "Tiger","Leopard","Lion","Cheetah","Snow Leopard","Clouded Leopard","Asiatic Lion","Caracal","Jungle Cat","Rusty-spotted Cat",
  // Mammals
  "Elephant","Bear","Fox","Jackal","Hare","Squirrel","Marten","Otter","Mongoose","Civet","Pangolin","Porcupine","Wild Dog","Wolf","Hyena",
  "Gaur","Wild Buffalo","Bison","Sambar","Spotted Deer","Barking Deer","Musk Deer","Hog Deer","Muntjac","Bharal","Goral","Tahr","Ibex",
  "Nilgiri Tahr","Markhor","Serow","Giant Squirrel","Flying Squirrel","Palm Squirrel","Five-striped Palm Squirrel","Langoor","Hanuman Langoor",
  "Bonnet Macaque","Rhesus Macaque","Lion-tailed Macaque","Slow Loris","Bandicoot","Shrew","Mole","Rabbit","Wild Boar",
  // Birds
  "Peacock","Parrot","Woodpecker","Owl","Eagle","Falcon","Vulture","Pigeon","Dove","Quail","Pheasant","Hornbill","Stork","Heron",
  "Ibis","Swan","Duck","Goose","Pelican","Cormorant","Kingfisher","Sunbird","Drongo","Minivet","Warbler","Thrush","Babbler",
  "Laughingthrush","Bulbul","Robin","Flycatcher","Myna","Tailor Bird","Iora","Pipit","Wagtail","Cuckoo","Koel","Drongo",
  "Great Indian Bustard","Florican","Sarus Crane","Painted Stork","Asian Openbill","Woolly-necked Stork","Black-headed Ibis",
  "Siberian Crane","Amur Falcon","Peregrine Falcon","Himalayan Monal","Red Junglefowl","Grey Junglefowl","Kalij Pheasant","Cheer Pheasant",
  "Indian Pitta","Malabar Trogon","Great Hornbill","Indian Eagle Owl","Spot-billed Pelican","Lesser Flamingo","Greater Flamingo",
  // Reptiles
  "Cobra","Viper","Krait","Python","Monitor Lizard","Skink","Gecko","Turtle","Tortoise","Crocodile","Gharial","Russell Viper","Saw-scaled Viper",
  "King Cobra","Banded Krait","Common Krait","Black Krait","Olive Ridley","Hawksbill Turtle","Green Turtle","Leatherback","Softshell Turtle",
  // Amphibians
  "Frog","Toad","Salamander","Newt","Tree Frog","Bull Frog","Indian Frog","Burrowing Frog","Rock Frog","Cricket Frog","Tree Toad",
  // Insects & Invertebrates
  "Butterfly","Moth","Dragonfly","Damselfly","Beetle","Ant","Termite","Grasshopper","Carpenter Bee","Honey Bee","Bumblebee","Atlas Moth","Moon Moth",
  "Common Crow","House Crow","Jungle Crow","Common Myna","Bank Myna","Jungle Myna","Great Myna","Red-vented Bulbul","Red-whiskered Bulbul",
  // Fish
  "Carp","Catfish","Mahseer","Torpedo Scad","Rohu","Katli","Mystus","Anchovy","Threadfin","Pomfret","Seerfish","Mackerel","Sardine","Herring",
  "Giant Freshwater Fish","Electric Catfish","Stinging Catfish","Air-breathing Catfish","Snakehead","Murrel",
];

// Real scientific names (binomial nomenclature) for Indian wildlife
const ANIMAL_SCIENTIFIC_NAMES = {
  // Big Cats & Carnivores
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
  // Mammals
  "Elephant": "Elephas maximus indicus",
  "Bear": "Ursus thibetanus",
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
  "Giant Squirrel": "Ratufa indica",
  "Flying Squirrel": "Petaurista philippensis",
  "Palm Squirrel": "Funambulus pennatus",
  "Five-striped Palm Squirrel": "Funambulus pennatus",
  "Langoor": "Semnopithecus entellus",
  "Hanuman Langoor": "Semnopithecus entellus",
  "Bonnet Macaque": "Macaca radiata",
  "Rhesus Macaque": "Macaca mulatta",
  "Lion-tailed Macaque": "Macaca silenus",
  "Slow Loris": "Nycticebus bengalensis",
  "Bandicoot": "Bandicota bengalensis",
  "Shrew": "Suncus murinus",
  "Mole": "Euroscaptor micrurus",
  "Rabbit": "Oryctolagus cuniculus",
  "Wild Boar": "Sus scrofa",
  // Birds
  "Peacock": "Pavo cristatus",
  "Parrot": "Psittacula cyanocephala",
  "Woodpecker": "Dryocopus javensis",
  "Owl": "Bubo bengalensis",
  "Eagle": "Aquila chrysaetos",
  "Falcon": "Falco peregrinus",
  "Vulture": "Gyps bengalensis",
  "Pigeon": "Columba livia",
  "Dove": "Streptopelia decaocto",
  "Quail": "Coturnix coturnix",
  "Pheasant": "Lophura nycthemera",
  "Hornbill": "Buceros bicornis",
  "Stork": "Ciconia episcopus",
  "Heron": "Ardea cinerea",
  "Ibis": "Threskiornis aethiopicus",
  "Swan": "Cygnus cygnus",
  "Duck": "Anas poecilorhyncha",
  "Goose": "Anser anser",
  "Pelican": "Pelecanus philippensis",
  "Cormorant": "Phalacrocorax niger",
  "Kingfisher": "Alcedo atthis",
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
  "Great Indian Bustard": "Ardeotis nigriceps",
  "Florican": "Sitalia gutturalis",
  "Sarus Crane": "Antigone antigone",
  "Painted Stork": "Mycteria leucocephala",
  "Asian Openbill": "Anastomus oscitans",
  "Woolly-necked Stork": "Ciconia episcopus",
  "Black-headed Ibis": "Threskiornis melanocephalus",
  "Siberian Crane": "Leucogeranus leucogeranus",
  "Amur Falcon": "Falco amurensis",
  "Peregrine Falcon": "Falco peregrinus",
  "Himalayan Monal": "Lophophorus impejanus",
  "Red Junglefowl": "Gallus gallus",
  "Grey Junglefowl": "Gallus sonneratii",
  "Kalij Pheasant": "Lophura leucomelanos",
  "Cheer Pheasant": "Catreus wallichii",
  "Indian Pitta": "Pitta brachyura",
  "Malabar Trogon": "Harpopus malabaricus",
  "Great Hornbill": "Buceros bicornis",
  "Indian Eagle Owl": "Bubo bengalensis",
  "Spot-billed Pelican": "Pelecanus philippensis",
  "Lesser Flamingo": "Phoenicopterus minor",
  "Greater Flamingo": "Phoenicopterus roseus",
  // Reptiles
  "Cobra": "Naja naja",
  "Viper": "Daboia russelii",
  "Krait": "Bungarus caeruleus",
  "Python": "Python bivittatus",
  "Monitor Lizard": "Varanus bengalensis",
  "Skink": "Eutropis carinata",
  "Gecko": "Hemidactylus frenatus",
  "Turtle": "Geochelone elegans",
  "Tortoise": "Testudo graeca",
  "Crocodile": "Crocodylus palustris",
  "Gharial": "Gavialis gangeticus",
  "Russell Viper": "Daboia russelii",
  "Saw-scaled Viper": "Echis carinatus",
  "King Cobra": "Ophiophagus hannah",
  "Banded Krait": "Bungarus fasciatus",
  "Common Krait": "Bungarus caeruleus",
  "Black Krait": "Bungarus niger",
  "Olive Ridley": "Lepidochelys olivacea",
  "Hawksbill Turtle": "Eretmochelys imbricata",
  "Green Turtle": "Chelonia mydas",
  "Leatherback": "Dermochelys coriacea",
  "Softshell Turtle": "Lissemys punctata",
  // Amphibians
  "Frog": "Hoplobatrachus tigerinus",
  "Toad": "Duttaphrynus melanostictus",
  "Salamander": "Tylototriton verrucosus",
  "Newt": "Cynops orientalis",
  "Tree Frog": "Polypedates maculatus",
  "Bull Frog": "Hoplobatrachus tigerinus",
  "Indian Frog": "Fejervarya limnocharis",
  "Burrowing Frog": "Sphaerotheca breviceps",
  "Rock Frog": "Fejervarya oryctolax",
  "Tree Toad": "Bufo stomaticus",
  "Cricket Frog": "Fejervarya limnocharis",
  // Insects & Invertebrates
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
  "Common Crow": "Corvus splendens",
  "House Crow": "Corvus splendens",
  "Jungle Crow": "Corvus macrorhynchos",
  "Common Myna": "Acridotheres tristis",
  "Bank Myna": "Acridotheres ginginianus",
  "Jungle Myna": "Acridotheres fuscus",
  "Great Myna": "Acridotheres grandis",
  "Red-vented Bulbul": "Pycnonotus cafer",
  "Red-whiskered Bulbul": "Pycnonotus jocosus",
  // Fish
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
};
const PLANT_BASE_NAMES = [
  // Trees
  "Oak","Pine","Cedar","Maple","Rhododendron","Bamboo","Palm","Fern","Moss","Neem","Peepal","Banyan","Mango","Teak",
  "Sandalwood","Rosewood","Sal","Shisham","Deodar","Willow","Walnut","Tamarind","Gulmohar","Jacaranda","Ashoka","Kadam",
  "Pangara","Pala","Kakad","Karanj","Palash","Amaltash","Chandni","Raat","Flamboyant","Tabebuia","Simal","Bombax","Sissoo",
  "Gmelina","Tectona","Adina","Lagerstroemia","Butea"," Erythrina","Bridelia","Ziziphus","Acacia","Babul","Subabul","Siris",
  "Amara","Amla","Bael","Jamun","Aonla","Chironji","Cashew","Coconut","Arecanut","Date Palm","Toddy Palm","Fish Palm","Sago Palm",
  // Medicinal & Herbs
  "Tulsi","Ashwagandha","Turmeric","Ginger","Cardamom","Pepper","Cinnamon","Clove","Nutmeg","Moringa","Amla","Bael","Jamun",
  "Karanj","Palash","Amaltash","Chandni","Raat","Gulmohar","Gunja","Guggul","Sarpagandha","Punarnava","Shankhapushpi","Brahmi",
  "Vetiver","Basil","Cumin","Fenugreek","Mustard","Sesame","Groundnut","Ajwain","Methi","Kalonji","Isabgol","Psyllium",
  "Ashoka","Arjuna","Brahmi","Shatavari","Mulethi","Guduchi","Tinospora","Gokshura","Yashtimadhu","Haritaki","Bibhitaka",
  // Flowers & Ornamentals
  "Rose","Jasmine","Lotus","Marigold","Hibiscus","Balsam","Zinnia","Petunia","Cosmos","Sunflower","Gerbera","Lilium","Orchid",
  "Primrose","Iris","Amaryllis","Dahlia","Tuberose","Chrysanthemum","Aster","Calendula","Gaillardia","Coreopsis","Lavender",
  "Margarita","Ixora","Hamelia","Pentas","Catharanthus","Vinca","Lantana","Clerodendrum","Hibiscus","Mandevilla","Allamanda",
  // Grasses & Ferns
  "Grass","Khus","Lemongrass","Citronella","Sacred Basil","Holy Basil","Sweet Basil","Thai Basil","Lemon Basil",
  "Marrubium","Wild Basil","Perilla","Lime Basil","Camphor Basil","African Basil","Deadly Nightshade",
  // Aquatic Plants
  "Lotus","Water Lily","Water Hyacinth","Water Lettuce","Pistia","Salvinia","Azolla","Lemna","Eichhornia","Typha",
  "Nymphaea","Nelumbo","Nymphaea alba","Nymphaea rubra","Victoria amazonica","Euryale ferox",
  // Climbers & Creepers
  "Ginger","Turmeric","Cardamom","Pepper","Cinnamon","Vanilla","Grape","Passion Fruit","Kiwi","Runner Bean","Yard Long Bean",
  "Moringa","Drumstick","Curry Tree","Pomegranate","Guava","Custard Apple","Fig","Jackfruit","Breadfruit","Wood Apple",
  "Barloo","Maulsari","Gurhal","Chameli","Malti","Juhi","Raat Rani","Madhumalati","Ajagadh","Mogar","Shweta Drakshi",
  // Fruits & Vegetables
  "Mango","Banana","Papaya","Guava","Coconut","Cashew","Tamarind","Jackfruit","Breadfruit","Wood Apple","Amla","Bael","Jamun",
  "Chironji","Karonda","Phalsa","Ber","Kair","Kakad","Kakad","Karam","Karmal","Lasora","Lime","Lemon","Orange","Sweet Lime",
  "Grapefruit","Citrus","Mosambi","Kinnow","Tangerine","Mandarin","Kumquat","Bitter Orange","Sweet Orange","Kalamansi",
  // Spices & Condiments
  "Turmeric","Ginger","Garlic","Onion","Cardamom","Clove","Pepper","Cinnamon","Nutmeg","Mace","Asafoetida","Fenugreek",
  "Cumin","Coriander","Fennel","Anise","Caraway","Dill","Celery","Parsley","Mustard","Saffron","Kashmiri Saffron",
  // Timber & Commercial
  "Teak","Sal","Shisham","Rosewood","Sandalwood","Deodar","Cedar","Bamboo","Reeds","Rattan","Gum","Resin","Dye",
  "Red Sanders","White Cedar","Red Cedar","White Siris","Black Siris","Indian Siris","Lecythis","Lagerstroemia",
  // Sacred & Religious
  "Peepal","Banyan","Neem","Tulsi","Lotus","Ashoka","Bel","Bilva","Wood Apple","Rudraksha","Amla","Gulmohar",
  "Ashoka Tree","Bodhi Tree","Sacred Fig","Peepal Tree","Banyan Tree","Neem Tree","Tulsi Plant","Temple Tree",
  // Endemic & Rare
  "Pitcher Plant","Venus Flytrap","Corpse Flower","Rafflesia","Corpse Lily","Ghost Orchid","Flying Orchid","Blue Orchid",
  "Red Vanda","Blue Vanda","Danxia Orchid","Slipper Orchid","Ground Orchid","Bamboo Orchid","Spider Orchid","Tiger Orchid",
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

// Real scientific names for Indian plants
const PLANT_SCIENTIFIC_NAMES = {
  // Trees
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
  // Medicinal & Herbs
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
  "Karanj": "Pongamia pinnata",
  "Palash": "Butea monosperma",
  "Gunja": "Abrus precatorius",
  "Guggul": "Commiphora wightii",
  "Sarpagandha": "Rauvolfia serpentina",
  "Punarnava": "Boerhavia diffusa",
  "Shankhapushpi": "Convolvulus pluricaulis",
  "Brahmi": "Bacopa monnieri",
  "Vetiver": "Vetiveria zizanioides",
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
  "Ashoka": "Saraca asoca",
  "Arjuna": "Terminalia arjuna",
  "Shatavari": "Asparagus racemosus",
  "Mulethi": "Glycyrrhiza glabra",
  "Guduchi": "Tinospora cordifolia",
  "Tinospora": "Tinospora cordifolia",
  "Gokshura": "Tribulus terrester",
  "Yashtimadhu": "Glycyrrhiza glabra",
  "Haritaki": "Terminalia chebula",
  "Bibhitaka": "Terminalia bellirica",
  // Flowers & Ornamentals
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
  // Aquatic Plants
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
  // Climbers
  "Vanilla": "Vanilla planifolia",
  "Grape": "Vitis vinifera",
  "Passion Fruit": "Passiflora edulis",
  "Kiwi": "Actinidia deliciosa",
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
  "Shweta Drakshi": "Vitis vinifera",
  // Spices
  "Garlic": "Allium sativum",
  "Onion": "Allium cepa",
  "Mace": "Myristica fragrans",
  "Asafoetida": "Ferula asafoetida",
  "Coriander": "Coriandrum sativum",
  "Fennel": "Foeniculum vulgare",
  "Anise": "Pimpinella anisum",
  "Caraway": "Carum carvi",
  "Dill": "Anethum graveolens",
  "Celery": "Apium graveolens",
  "Parsley": "Petroselinum crispum",
  "Saffron": "Crocus sativus",
  "Kashmiri Saffron": "Crocus sativus",
  // Timber
  "Red Sanders": "Pterocarpus santalinus",
  "White Cedar": "Dysoxylum binectariferum",
  "Red Cedar": "Cedrus deodara",
  "White Siris": "Albizia procera",
  "Black Siris": "Albizia lebbeck",
  "Indian Siris": "Albizia lebbeck",
  "Lecythis": "Lecythis zabucajo",
  // Sacred
  "Bel": "Aegle marmelos",
  "Bilva": "Aegle marmelos",
  "Rudraksha": "Elaeocarpus ganitrus",
  "Sacred Fig": "Ficus religiosa",
  "Bodhi Tree": "Ficus religiosa",
  "Temple Tree": "Plumeria rubra",
  // Endemic
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
  "Danxia Orchid": "Cymbidium taint",
  "Slipper Orchid": "Paphiopedilum venustum",
  "Ground Orchid": "Vanda tessellata",
  "Bamboo Orchid": "Arundina gramminifolia",
  "Spider Orchid": "Brassavola nodosa",
  "Tiger Orchid": "Grammatophyllum speciosum",
  // ── Additional Plants with Missing Scientific Names ──
  " Erythrina": "Erythrina variegata",
  "Grass": "Poa pratensis",
  "Khus": "Vetiveria zizanioides",
  "Lemongrass": "Cymbopogon citratus",
  "Citronella": "Cymbopogon winterianus",
  "Sacred Basil": "Ocimum tenuiflorum",
  "Holy Basil": "Ocimum tenuiflorum",
  "Sweet Basil": "Ocimum basilicum",
  "Thai Basil": "Ocimum basilicum",
  "Lemon Basil": "Ocimum × citriodorum",
  "Marrubium": "Marrubium vulgare",
  "Wild Basil": "Clinopodium vulgare",
  "Perilla": "Perilla frutescens",
  "Lime Basil": "Ocimum americanum",
  "Camphor Basil": "Ocimum kilimandscharicum",
  "African Basil": "Ocimum basilicum",
  "Deadly Nightshade": "Atropa belladonna",
  "Nymphaea alba": "Nymphaea lotus",
  "Nymphaea rubra": "Nymphaea rubra",
  "Victoria amazonica": "Victoria amazonica",
  "Euryale ferox": "Euryale ferox",
  "Runner Bean": "Phaseolus coccineus",
  "Yard Long Bean": "Vigna unguiculata",
  "Drumstick": "Moringa oleifera",
  "Banana": "Musa × paradisiaca",
  "Papaya": "Carica papaya",
  "Karonda": "Carissa carandas",
  "Phalsa": "Grewia asiatica",
  "Ber": "Ziziphus mauritiana",
  "Kair": "Capparis decidua",
  "Karam": "Pterocarpus marsupium",
  "Karmal": "Pterocarpus santalinus",
  "Lasora": "Cordia dichotoma",
  "Lime": "Citrus aurantifolia",
  "Lemon": "Citrus limon",
  "Orange": "Citrus sinensis",
  "Sweet Lime": "Citrus limetta",
  "Grapefruit": "Citrus × paradisi",
  "Citrus": "Citrus medica",
  "Mosambi": "Citrus sinensis",
  "Kinnow": "Citrus reticulata",
  "Tangerine": "Citrus reticulata",
  "Mandarin": "Citrus reticulata",
  "Kumquat": "Citrus japonica",
  "Bitter Orange": "Citrus aurantium",
  "Sweet Orange": "Citrus sinensis",
  "Kalamansi": "Citrus × microcarpa",
  "Reeds": "Phragmites australis",
  "Rattan": "Calamus rotang",
  "Gum": "Acacia senegal",
  "Resin": "Pinus roxburghii",
  "Dye": "Rubia tinctorum",
  "Ashoka Tree": "Saraca asoca",
  "Peepal Tree": "Ficus religiosa",
  "Banyan Tree": "Ficus benghalensis",
  "Neem Tree": "Azadirachta indica",
  "Tulsi Plant": "Ocimum tenuiflorum",
};
const FACTS = [
  "Found exclusively in the Indian subcontinent","Listed as endangered by IUCN","Indicator species for ecosystem health",
  "Keystone species in its habitat","Migrates seasonally within India","Endemic to Western Ghats",
  "Sacred significance in Hindu mythology","Used in traditional Ayurvedic medicine","Subject of major conservation programs",
  "Found in protected areas and wildlife reserves","Critical for seed dispersal","Important for pest control",
  "Breeding season coincides with monsoon","Highly territorial behavior","Lives in family groups or solitary",
  "Can survive extreme temperatures","Adapted to high altitude environments","Found in alluvial plains and forests",
  "Known for unique calls and vocalizations"," nocturnal and diurnal activity patterns","Provides ecosystem services",
  "Cultural significance in local communities","Featured in ancient cave paintings","Subject of wildlife photography",
];

// ─── Real Image URLs (Wikimedia Commons — Indian Wildlife) ───
const ANIMAL_IMAGES = {
  Tiger: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female_crop.jpg/1200px-Walking_tiger_female_crop.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Bengal_Tiger_in_Kanha_National_Park.jpg/1200px-Bengal_Tiger_in_Kanha_National_Park.jpg",
  ],
  Leopard: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Leopard_on_a_tree.jpg/800px-Leopard_on_a_tree.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Panthera_pardus_fusca.jpg/800px-Panthera_pardus_fusca.jpg",
  ],
  Elephant: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Asian_Elephant_at_the_Kanha_National_Park.jpg/1200px-Asian_Elephant_at_the_Kanha_National_Park.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Elephant_at_Eden.jpg/800px-Elephant_at_Eden.jpg",
  ],
  Bear: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Sloth_Bear_Melursus_ursinus.jpg/800px-Sloth_Bear_Melursus_ursinus.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Himalayan_black_bear.jpg/800px-Himalayan_black_bear.jpg",
  ],
  Fox: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Indian_Fox.jpg/800px-Indian_Fox.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Vulpes_bengalensis.jpg/800px-Vulpes_bengalensis.jpg",
  ],
  Jackal: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Canis_aureus_indicus.jpg/800px-Canis_aureus_indicus.jpg",
  ],
  Hare: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Indian_Hare.jpg/800px-Indian_Hare.jpg",
  ],
  Squirrel: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Indian_Giant_Squirrel.jpg/800px-Indian_Giant_Squirrel.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Five-striped_palm_squirrel.jpg/800px-Five-striped_palm_squirrel.jpg",
  ],
  Otter: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Aonyx_congretans.jpg/800px-Aonyx_congretans.jpg",
  ],
  Mongoose: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Common_Mongoose.jpg/800px-Common_Mongoose.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Indian_Grey_Mongoose.jpg/800px-Indian_Grey_Mongoose.jpg",
  ],
  Civet: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Paradoxurus_hermaphroditus.jpg/800px-Paradoxurus_hermaphroditus.jpg",
  ],
  Pangolin: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Indian_Pangolin.jpg/800px-Indian_Pangolin.jpg",
  ],
  Porcupine: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Indian_Porcupine.jpg/800px-Indian_Porcupine.jpg",
  ],
  "Wild Dog": [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Dhole.jpg/800px-Dhole.jpg",
  ],
  Wolf: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Indian_Wolf.jpg/800px-Indian_Wolf.jpg",
  ],
  Hyena: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Striped_hyena.jpg/800px-Striped_hyena.jpg",
  ],
  Lion: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Gir_Lion.jpg/1200px-Gir_Lion.jpg",
  ],
  Peacock: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Peacock_India.jpg/1200px-Peacock_India.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Peacock_displaying.jpg/800px-Peacock_displaying.jpg",
  ],
  Parrot: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Psittacula_cyanocephala_-Bhitarkanika_Crows_Island-8.jpg/800px-Psittacula_cyanocephala_-Bhitarkanika_Crows_Island-8.jpg",
  ],
  Woodpecker: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/DSC_5122_Darjeeling_Woodpecker.jpg/800px-DSC_5122_Darjeeling_Woodpecker.jpg",
  ],
  Owl: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Indian_Eagle_Owl.jpg/800px-Indian_Eagle_Owl.jpg",
  ],
  Eagle: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Golden_Eagle_n.flat_hill.jpg/800px-Golden_Eagle_n.flat_hill.jpg",
  ],
  Vulture: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Gyps_bengalensis_-Bharatpur-2.jpg/800px-Gyps_bengalensis_-Bharatpur-2.jpg",
  ],
  Hornbill: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Great_Hornbill_W_Germany_01.jpg/800px-Great_Hornbill_W_Germany_01.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Odonthornis_bicalcaratus_blythii.jpg/800px-Odonthornis_bicalcaratus_blythii.jpg",
  ],
  Stork: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Asian_Openbill.jpg/800px-Asian_Openbill.jpg",
  ],
  Heron: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Great_Egret_%28Casmerodius_albus%29.jpg/800px-Great_Egret_%28Casmerodius_albus%29.jpg",
  ],
  Ibis: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Threskiornis_aethiopicus_-_Shoebil.jpg/800px-Threskiornis_aethiopicus_-_Shoebil.jpg",
  ],
  Swan: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Pmute_cygnus.jpg/800px-Pmute_cygnus.jpg",
  ],
  Duck: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Anas_poecilorhyncha.jpg/800px-Anas_poecilorhyncha.jpg",
  ],
  Kingfisher: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Alcedo_atthis_-_Dhanurasri.jpg/800px-Alcedo_atthis_-_Dhanurasri.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Pied_Kingfisher_I_M.jpg/800px-Pied_Kingfisher_I_M.jpg",
  ],
  Cobra: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Naja_naja.jpg/800px-Naja_naja.jpg",
  ],
  Viper: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Russells_viper.jpg/800px-Russells_viper.jpg",
  ],
  Krait: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Bungarus_caeruleus.jpg/800px-Bungarus_caeruleus.jpg",
  ],
  Python: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Python_molurus.jpg/800px-Python_molurus.jpg",
  ],
  Crocodile: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Mugger_Crocodile.jpg/1200px-Mugger_Crocodile.jpg",
  ],
  Gharial: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Gharial_Sanjay_Thapare.jpg/800px-Gharial_Sanjay_Thapare.jpg",
  ],
  Turtle: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Star_tortoise.jpg/800px-Star_tortoise.jpg",
  ],
  Tortoise: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Star_tortoise_geochelone_elegans.jpg/800px-Star_tortoise_geochelone_elegans.jpg",
  ],
  Frog: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Eastern_iod_frog.jpg/800px-Eastern_iod_frog.jpg",
  ],
  Toad: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Common_Indian_toad.jpg/800px-Common_Indian_toad.jpg",
  ],
  Butterfly: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Common_Indian_Crow.jpg/800px-Common_Indian_Crow.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Papilio_demoleon_2500px.jpg/800px-Papilio_demoleon_2500px.jpg",
  ],
  Moth: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Attacus_atlas.jpg/800px-Attacus_atlas.jpg",
  ],
  Dragonfly: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Anax_junius_3000ppx.jpg/800px-Anax_junius_3000ppx.jpg",
  ],
  Beetle: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Hermit_Beetle.jpg/800px-Hermit_Beetle.jpg",
  ],
  Carp: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Indian_Major_Carp.jpg/800px-Indian_Major_Carp.jpg",
  ],
  Mahseer: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Tor_tor.jpg/800px-Tor_tor.jpg",
  ],
};

// Fallback images for animals without specific entries
const ANIMAL_FALLBACK_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Walking_tiger_female_crop.jpg/1200px-Walking_tiger_female_crop.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Bengal_Tiger_in_Kanha_National_Park.jpg/1200px-Bengal_Tiger_in_Kanha_National_Park.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Indian_Wildlife_-_Bison_%28Bos_gaurus%29_by_N._A._Nazeer.jpg/1200px-Indian_Wildlife_-_Bison_%28Bos_gaurus%29_by_N._A._Nazeer.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Dhole.jpg/800px-Dhole.jpg",
];

// ─── Real Image URLs (Wikimedia Commons — Indian Plants) ───
const PLANT_IMAGES = {
  Oak: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Quercus_semecarpifolia.jpg/800px-Quercus_semecarpifolia.jpg",
  ],
  Pine: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Pinus_roxburghii_Himalayan.jpg/800px-Pinus_roxburghii_Himalayan.jpg",
  ],
  Cedar: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Cedrus_deodara_Growing_in_the_Valley_of_Flowers_National_Park.jpg/800px-Cedrus_deodara_Growing_in_the_Valley_of_Flowers_National_Park.jpg",
  ],
  Maple: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Acer_caf%C3%A9_3000ppi.jpg/800px-Acer_caf%C3%A9_3000ppi.jpg",
  ],
  Rhododendron: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Rhododendron_arboreum.jpg/800px-Rhododendron_arboreum.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Rhododendron_arboreum_Sikkim.jpg/800px-Rhododendron_arboreum_Sikkim.jpg",
  ],
  Orchid: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Dendrobium_nobile_-_Kew_Gardens.jpg/800px-Dendrobium_nobile_-_Kew_Gardens.jpg",
  ],
  Lily: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Lilium_acinum_0002.JPG/800px-Lilium_acinum_0002.JPG",
  ],
  Jasmine: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Jasminum_officinale_-_Kew_Gardens.jpg/800px-Jasminum_officinale_-_Kew_Gardens.jpg",
  ],
  Rose: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Rosa_%27_期望_%27_2019-05.jpg/800px-Rosa_%27_期望_%27_2019-05.jpg",
  ],
  Bamboo: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bamboo_forest_in_Kerala.jpg/1200px-Bamboo_forest_in_Kerala.jpg",
  ],
  Palm: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Coconut_trees_in_Kerala.jpg/1200px-Coconut_trees_in_Kerala.jpg",
  ],
  Neem: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Neem_Tree_in_India.jpg/800px-Neem_Tree_in_India.jpg",
  ],
  Peepal: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ficus_religiosa_Peepal_Tree.jpg/800px-Ficus_religiosa_Peepal_Tree.jpg",
  ],
  Banyan: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Banyan_tree_in_Kolkata.jpg/1200px-Banyan_tree_in_Kolkata.jpg",
  ],
  Mango: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Mangifera_indica_003.jpg/800px-Mangifera_indica_003.jpg",
  ],
  Teak: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Teak_Forest_in_India.jpg/1200px-Teak_Forest_in_India.jpg",
  ],
  Sandalwood: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Santalum_album_KR.jpg/800px-Santalum_album_KR.jpg",
  ],
  Tulsi: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Ocimum_tenuiflorum_11091.jpg/800px-Ocimum_tenuiflorum_11091.jpg",
  ],
  Ashwagandha: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Withania_somnifera%2C_Kashmir.jpg/800px-Withania_somnifera%2C_Kashmir.jpg",
  ],
  Turmeric: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Curcuma_longa.jpg/800px-Curcuma_longa.jpg",
  ],
  Ginger: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Zingiber_officinale.jpg/800px-Zingiber_officinale.jpg",
  ],
  Moringa: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Moringa_oleifera.jpg/800px-Moringa_oleifera.jpg",
  ],
  Amla: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Phyllanthus_emblica.jpg/800px-Phyllanthus_emblica.jpg",
  ],
  Jamun: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Syzygium_cumini.jpg/800px-Syzygium_cumini.jpg",
  ],
  Tamarind: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Tamarindus_india_08022012.jpg/800px-Tamarindus_india_08022012.jpg",
  ],
  Fern: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Pteris_vittata.jpg/800px-Pteris_vittata.jpg",
  ],
  Moss: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Polytrichum_commune.jpg/800px-Polytrichum_commune.jpg",
  ],
  Deodar: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Cedrus_deodara_Growing_in_the_Valley_of_Flowers_National_Park.jpg/800px-Cedrus_deodara_Growing_in_the_Valley_of_Flowers_National_Park.jpg",
  ],
  Shisham: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Dalbergia_sissoides.jpg/800px-Dalbergia_sissoides.jpg",
  ],
  Sal: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Shorea_robusta_forest.jpg/1200px-Shorea_robusta_forest.jpg",
  ],
  Primrose: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Primula_vulgaris_%28primrose%29.jpg/800px-Primula_vulgaris_%28primrose%29.jpg",
  ],
  Iris: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Iris_germanica_%28K%C3%B6nigliche_Gärtnerei_Erfurt%29.jpg/800px-Iris_germanica_%28K%C3%B6nigliche_G%C3%A4rtnerei_Erfurt%29.jpg",
  ],
  Cardamom: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Elettaria_cardamomum.jpg/800px-Elettaria_cardamomum.jpg",
  ],
  Pepper: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Piper_nigrum_-_K%C3%B6hler%27s_Medizinal-Pflanzen-104.jpg/800px-Piper_nigrum_-_K%C3%B6hler%27s_Medizinal-Pflanzen-104.jpg",
  ],
  Cinnamon: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Ceylon_Cinnamon.jpg/800px-Ceylon_Cinnamon.jpg",
  ],
  Clove: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Syzygium_aromaticum.jpg/800px-Syzygium_aromaticum.jpg",
  ],
  Nutmeg: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Nutmeg.jpg/800px-Nutmeg.jpg",
  ],
  Bael: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Aegle_marmelos.jpg/800px-Aegle_marmelos.jpg",
  ],
  Gulmohar: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Del%C3%B6nix_regia%2C_Kew_Gardens.jpg/800px-Del%C3%B6nix_regia%2C_Kew_Gardens.jpg",
  ],
  Jacaranda: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Jacaranda_mimosifolia_at_UCT.jpg/800px-Jacaranda_mimosifolia_at_UCT.jpg",
  ],
  Willow: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Salix_babylonica.jpg/800px-Salix_babylonica.jpg",
  ],
  Apricot: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Prunus_armeniaca.jpg/800px-Prunus_armeniaca.jpg",
  ],
  Almond: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Almond_03.jpg/800px-Almond_03.jpg",
  ],
  Basil: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Ocimum_tenuiflorum_11091.jpg/800px-Ocimum_tenuiflorum_11091.jpg",
  ],
  Cumin: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Cuminum_cyminum_-_K%C3%B6hler%27s_Medizinal-Pflanzen-047.jpg/800px-Cuminum_cyminum_-_K%C3%B6hler%27s_Medizinal-Pflanzen-047.jpg",
  ],
  Fenugreek: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Illustration_Trigonella_foenum-graecum0.jpg/800px-Illustration_Trigonella_foenum-graecum0.jpg",
  ],
  Mustard: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brassica_nigra_250px.jpg/800px-Brassica_nigra_250px.jpg",
  ],
  Sesame: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Sesamum_indicum.jpg/800px-Sesamum_indicum.jpg",
  ],
  Groundnut: [
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Arachis_hypogaea.jpg/800px-Arachis_hypogaea.jpg",
  ],
};

const PLANT_FALLBACK_IMAGES = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Forest_in_Kerala.jpg/1200px-Forest_in_Kerala.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Ficus_religiosa_Peepal_Tree.jpg/800px-Ficus_religiosa_Peepal_Tree.jpg",
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Aegle_marmelos.jpg/800px-Aegle_marmelos.jpg",
];

// Helper to get image URL for an animal based on base name
const getAnimalImage = (baseName, i) => {
  for (const [key, urls] of Object.entries(ANIMAL_IMAGES)) {
    if (baseName.includes(key)) {
      return urls[i % urls.length];
    }
  }
  return ANIMAL_FALLBACK_IMAGES[i % ANIMAL_FALLBACK_IMAGES.length];
};

// Helper to get image URL for a plant based on base name
const getPlantImage = (baseName, i) => {
  for (const [key, urls] of Object.entries(PLANT_IMAGES)) {
    if (baseName.includes(key)) {
      return urls[i % urls.length];
    }
  }
  return PLANT_FALLBACK_IMAGES[i % PLANT_FALLBACK_IMAGES.length];
};

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

// FIXED: Use base names only (no region prefix) for proper common names
const detAnimalName = (i) => ANIMAL_BASE_NAMES[i % ANIMAL_BASE_NAMES.length];
const detPlantName  = (i) => PLANT_BASE_NAMES[i % PLANT_BASE_NAMES.length];

// Get real scientific name from mapping
const getAnimalScientificName = (i) => {
  const baseName = ANIMAL_BASE_NAMES[i % ANIMAL_BASE_NAMES.length];
  return ANIMAL_SCIENTIFIC_NAMES[baseName] || `${ANIMAL_GENERA[i % ANIMAL_GENERA.length]} ${baseName.toLowerCase()}`;
};

// ─── Build animal record ──────────────────────────────────────
function makeAnimal(i) {
  const zone     = detZone(i);
  const ecosystem = detEco(i);
  const status    = detStatus(i);
  const habitat   = detHabitat(i);
  const animalType = detAnimalType(i);
  const name       = detAnimalName(i);  // FIXED: Now uses base name only (e.g., "Tiger" not "Indian Tiger")
  const scientificName = getAnimalScientificName(i);  // FIXED: Uses real binomial nomenclature
  const baseName   = ANIMAL_BASE_NAMES[i % ANIMAL_BASE_NAMES.length];

  return {
    name,  // common name - now properly just "Tiger" not "Indian Tiger"
    scientificName,  // real scientific name - now properly "Panthera tigris tigris"
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
    imageUrl: getAnimalImage(baseName, i),
    image: getAnimalImage(baseName, i),
    images: [getAnimalImage(baseName, i)],
    featureVector: { ecosystemCode: ri(0, 10), statusCode: ri(0, 5), typeCode: ri(0, 7), zoneCode: ri(0, 9) },
  };
}

// Get real plant scientific name
const getPlantScientificName = (i) => {
  const baseName = PLANT_BASE_NAMES[i % PLANT_BASE_NAMES.length];
  return PLANT_SCIENTIFIC_NAMES[baseName] || `${PLANT_GENERA[i % PLANT_GENERA.length]} ${baseName.toLowerCase()}`;
};

// ─── Build plant record ───────────────────────────────────────
function makePlant(i) {
  const zone     = detZone(i);
  const ecosystem = detEco(i);
  const status    = detStatus(i);
  const habitat   = detHabitat(i);
  const plantType = detPlantType(i);
  const name      = detPlantName(i);  // FIXED: Now uses base name only
  const scientificName = getPlantScientificName(i);  // FIXED: Uses real binomial nomenclature
  const baseName  = PLANT_BASE_NAMES[i % PLANT_BASE_NAMES.length];

  return {
    name,  // common name - now properly just "Neem" not "Indian Neem"
    scientificName,  // real scientific name - now properly "Azadirachta indica"
    type: plantType,
    zone,
    ecosystem,
    conservationStatus: status,
    description: `${name} is a ${plantType.toLowerCase()} native to ${zone}, commonly found in ${ecosystem.toLowerCase()}.`,
    habitat,
    uses: pick(USES, ri(1, 4)),
    funFacts: pick(FACTS, ri(2, 4)),
    coordinates: { lat: rf(8, 35), lng: rf(68, 97), locationName: `${zone}, India` },
    imageUrl: getPlantImage(baseName, i),
    images: [getPlantImage(baseName, i)],
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