const mongoose = require('mongoose');
require('dotenv').config();
const Species = require('../models/Species');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await Species.updateMany(
    { imageUrl: /wikipedia/ },
    { $set: { imageUrl: '', images: [], image: '' } }
  );
  console.log('Cleared bad Wikipedia images:', result.modifiedCount);
  process.exit(0);
});
