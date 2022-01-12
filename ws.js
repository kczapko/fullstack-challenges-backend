const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { parse, validate, GraphQLError } = require('graphql');

const schema = require('./graphql/schema');
const resolver = require('./graphql/resolvers');

const User = require('./models/user');
const { decodeToken } = require('./utils/token');

const getUser = async (token) => {
  if (!token) return new GraphQLError('You must provide token to access this resource.');

  try {
    const decoded = await decodeToken(token);
    const user = await User.findById(decoded.id);

    if (!user) return new GraphQLError('User not found.');

    if (user.blocked) return new GraphQLError('Your account has been blocked.');
    if (user.passwordChangedAt && user.passwordChangedAt > new Date(decoded.iat * 1000))
      return new GraphQLError('You recently changed password. Please login again.');

    return user;
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return new GraphQLError('Wrong token');
    if (err.name === 'TokenExpiredError') return new GraphQLError('Token expired');
    return new GraphQLError(err.message);
  }
};

exports.createWebSocketGraphQlServer = (server) => {
  const wsServer = new WebSocketServer({
    server,
    path: '/graphql',
  });

  useServer(
    {
      onSubscribe: async (ctx, msg) => {
        const user = await getUser(msg.payload.variables.token);
        if (user instanceof GraphQLError) return [user];
        ctx.user = user;

        const args = {
          schema,
          rootValue: resolver,
          contextValue: ctx,
          operationName: msg.payload.operationName,
          document: parse(msg.payload.query),
          variableValues: msg.payload.variables,
        };

        const errors = validate(args.schema, args.document);
        if (errors.length > 0) return errors;

        return args;
      },
    },
    wsServer,
  );
};
