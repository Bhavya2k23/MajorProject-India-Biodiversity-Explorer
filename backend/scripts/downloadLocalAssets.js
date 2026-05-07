const https = require('https');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', '..', 'india-s-wild-explorer', 'public', 'images');

if (!fs.existsSync(targetDir)){
    fs.mkdirSync(targetDir, { recursive: true });
}

const images = {
  "tiger.jpg": "https://upload.wikimedia.org/wikipedia/commons/1/17/Tiger_in_Ranthambhore.jpg",
  "elephant.jpg": "https://upload.wikimedia.org/wikipedia/commons/3/37/African_Bush_Elephant.jpg",
  "leopard.jpg": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Snow_leopard_%28Uncia_uncia%29_2.jpg",
  "peacock.jpg": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Peacock_Plumage.jpg",
  "lion.jpg": "https://upload.wikimedia.org/wikipedia/commons/7/73/Lion_waiting_in_Namibia.jpg",
  "bear.jpg": "https://upload.wikimedia.org/wikipedia/commons/3/34/Sloth_bear_peshkar.jpg",
  "deer.jpg": "https://upload.wikimedia.org/wikipedia/commons/9/93/An_Indian_hog_deer.jpg",
  "wolf.jpg": "https://upload.wikimedia.org/wikipedia/commons/5/5f/White_wolf.jpg",
  "macaque.jpg": "https://upload.wikimedia.org/wikipedia/commons/8/8c/Macaca_silenus_-_Buffalo_Zoo.jpg",
  "snake.jpg": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Indian_cobra.jpg",
  "reptile.jpg": "https://upload.wikimedia.org/wikipedia/commons/2/23/Gavialis_gangeticus_2.jpg",
  "aquatic.jpg": "https://upload.wikimedia.org/wikipedia/commons/1/15/Dugong_dugon.jpg",
  "fallback.jpg": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Tsomgo_Lake.jpg/800px-Tsomgo_Lake.jpg"
};

Object.entries(images).forEach(([filename, url]) => {
  const file = fs.createWriteStream(path.join(targetDir, filename));
  https.get(url, { headers: { 'User-Agent': 'NodeApp' } }, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${filename}`);
    });
  }).on('error', (err) => {
    fs.unlink(path.join(targetDir, filename));
    console.error(`Error downloading ${filename}: ${err.message}`);
  });
});
