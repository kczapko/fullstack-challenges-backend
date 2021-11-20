const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { graphqlHTTP } = require('express-graphql');
const schema = require('./graphql/schema');
const resolver = require('./graphql/resolvers');
const globalErrorHandler = require('./middleware/error');
const graphqlErrorHandler = require('./utils/graphqlError');

const app = express();

app.use(express.json());
app.use(mongoSanitize());

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
