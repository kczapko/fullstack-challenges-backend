const path = require('path');

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

const filesRoutes = require('./routes/files');

const app = express();

app.set('trust proxy', true);

app.use(express.static('public', { maxAge: '1y' }));
app.use(express.json());
app.use(mongoSanitize());

if (process.env.NODE_ENV === 'development')
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
else app.use(cors());

app.use(auth);

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: resolver,
    graphiql: process.env.NODE_ENV === 'development',
    customFormatErrorFn: graphqlErrorHandler,
  }),
);

app.use('/files', filesRoutes);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'script-src': [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://accounts.google.com',
          'https://connect.facebook.net',
        ],
        'default-src': ["'self'", 'https://accounts.google.com', 'https://www.facebook.com'],
        'img-src': [
          "'self'",
          'data:',
          'https://platform-lookaside.fbsbx.com',
          'https://pbs.twimg.com',
          'https://avatars.githubusercontent.com',
          'https://lh3.googleusercontent.com',
        ],
        frameAncestors: ['https://devchallenges.io'],
      },
    },
    frameguard: false,
  }),
);

app.use((req, res, next) => {
  res.status(200).sendFile('index.html', { root: path.join(__dirname, 'views') });
});

app.use(globalErrorHandler);

module.exports = app;
