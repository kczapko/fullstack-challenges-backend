const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const { graphqlHTTP } = require('express-graphql');

const schema = require('./graphql/schema');
const resolver = require('./graphql/resolvers');
const globalErrorHandler = require('./middleware/error');
const graphqlErrorHandler = require('./utils/graphqlError');
const auth = require('./middleware/auth');

const app = express();

app.use(express.static('public'));
app.use(express.json());
app.use(mongoSanitize());
app.use(
  cors({
    origin: [
      'http://localhost:8080',
      'https://localhost:8080',
      'http://127.0.0.1:8080',
      'https://127.0.0.1:8080',
      'http://127.0.0.1:5500',
    ],
  }),
);

app.use(auth);

app.use(
  '/graphql',
  graphqlHTTP({
    schema: schema,
    rootValue: resolver,
    graphiql: process.env.NODE_ENV === 'development',
    customFormatErrorFn: graphqlErrorHandler,
  }),
);

app.use(helmet());

app.use(globalErrorHandler);

module.exports = app;
