const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const app = express();

app.use(express.json());
app.use(mongoSanitize());
app.use(helmet());

app.use((error, req, res, next) => {
  console.log(`🎃🎃🎃`);
  console.log(error);
  console.log(`🎃🎃🎃`);
  res.send(500).json({ message: 'Internal server error' });
});

module.exports = app;
