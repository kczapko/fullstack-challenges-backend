const User = require('../models/user');
const AppError = require('../utils/AppError');
const errorTypes = require('../utils/errorTypes');
const { decodeToken } = require('../utils/token');

module.exports = async (req, res, next) => {
  if (!req.headers.authorization) return next();

  const token = req.headers.authorization.split(' ')[1];
  if (!token) return next();

  try {
    const decoded = await decodeToken(token);
    const user = await User.findById(decoded.id);

    if (user) {
      if (user.blocked)
        req.authError = new AppError(
          'Your account has been blocked.',
          errorTypes.AUTHENTICATION,
          403,
        );

      if (user.passwordChangedAt && user.passwordChangedAt > new Date(decoded.iat * 1000))
        req.authError = new AppError(
          'You recently changed password. Please login again.',
          errorTypes.AUTHENTICATION,
          403,
        );

      if (!req.authError) req.user = user;
    }
  } catch (err) {
    req.authError = err;
  }

  return next();
};
