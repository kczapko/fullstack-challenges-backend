const AppError = require('./AppError');
const errorTypes = require('./errorTypes');

module.exports = {
  catchGraphql: (fn) => {
    return async (args, req) => {
      try {
        return await fn(args, req);
      } catch (err) {
        throw err;
      }
    };
  },
  catchGraphqlAuth: (fn) => {
    return async (args, req) => {
      try {
        if (req.authError) throw req.authError;
        if (!req.user)
          throw new AppError('User does not exist or was deleted.', errorTypes.AUTHORIZATION, 401);

        return await fn(args, req);
      } catch (err) {
        throw err;
      }
    };
  },
  catchGraphqlConfimed: (fn) => {
    return async (args, req) => {
      try {
        if (req.authError) throw req.authError;
        if (!req.user)
          throw new AppError('User does not exist or was deleted.', errorTypes.AUTHORIZATION, 401);
        if (!req.user.emailConfirmed)
          throw new AppError('Please confirm your account!', errorTypes.AUTHORIZATION, 403);

        return await fn(args, req);
      } catch (err) {
        throw err;
      }
    };
  },
  catchExpress: (fn) => {
    return async (req, res, next) => {
      try {
        return await fn(req, res, next);
      } catch (err) {
        next(err);
      }
    };
  },
  catchExpressAuth: (fn) => {
    return async (req, res, next) => {
      try {
        if (req.authError) throw req.authError;
        if (!req.user)
          throw new AppError('User does not exist or was deleted.', errorTypes.AUTHORIZATION, 401);

        return await fn(req, res, next);
      } catch (err) {
        next(err);
      }
    };
  },
  catchExpressConfimed: (fn) => {
    return async (req, res, next) => {
      try {
        if (req.authError) throw req.authError;
        if (!req.user)
          throw new AppError('User does not exist or was deleted.', errorTypes.AUTHORIZATION, 401);
        if (!req.user.emailConfirmed)
          throw new AppError('Please confirm your account!', errorTypes.AUTHORIZATION, 403);

        return await fn(req, res, next);
      } catch (err) {
        next(err);
      }
    };
  },
};
