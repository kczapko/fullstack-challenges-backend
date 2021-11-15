require('./error');
require('dotenv').config({ path: './config.env' });

const app = require('./express');
const mongoose = require('mongoose');

const port = process.env.PORT || 3000;
const databaseUrl =
  process.env.NODE_ENV === 'production' ? process.env.DATABASE_PROD : process.env.DATABASE_DEV;

const init = async () => {
  await mongoose.connect(databaseUrl);
  app.listen(port, () => {
    console.log('🤟 Server started');
  });
};

init();
