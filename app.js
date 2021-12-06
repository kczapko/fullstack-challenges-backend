require('./error');
require('dotenv').config({ path: './config.env' });

const mongoose = require('mongoose');
const app = require('./express');

const port = process.env.PORT || 3000;
// prettier-ignore
const databaseUrl = process.env.NODE_ENV === 'production' ? process.env.DATABASE_PROD : process.env.DATABASE_DEV;

const init = async () => {
  await mongoose.connect(databaseUrl);
  app.listen(port, () => {
    console.log(`🤟 Server started on port ${port} in ${process.env.NODE_ENV} mode`);
  });
};

init();
