const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { graphqlHTTP } = require('express-graphql');
const schema = require('./graphql/schema');
const resolver = require('./graphql/resolvers');

const app = express();

app.use(express.json());
app.use(mongoSanitize());

app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: resolver,
    graphiql: process.env.NODE_ENV === 'development',
    customFormatErrorFn: (error) => {
      console.log('🧨🧨🧨');
      console.log(error.originalError ? error.originalError : error);
      console.log('🧨🧨🧨');

      return {
        message: error.message,
        locations: error.locations,
        stack: error.stack ? error.stack.split('\n') : [],
        path: error.path,
        original: error.originalError,
      };
    },
  }),
);

app.use(helmet());

app.use((error, req, res, next) => {
  console.log(`🎃🎃🎃`);
  console.log(error);
  console.log(`🎃🎃🎃`);
  res.send(500).json({ message: 'Internal server error' });
});

module.exports = app;
