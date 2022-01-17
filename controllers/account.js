const User = require('../models/user');
const AppError = require('../utils/AppError');
const errorTypes = require('../utils/errorTypes');
const { decodeToken } = require('../utils/token');
const { pubsub, CHAT_ACTION, ACTION_STATUS_CHANGED } = require('../utils/pubsub');

// exports.changeMyOnlineStatus = catchExpressConfimed(async (req, res, next) => {
exports.changeMyOnlineStatus = async (req, res, next) => {
  const { status, token } = req.body;

  if (!token || !status) return res.sendStatus(204);

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

      if (req.authError) throw req.authError;

      user.online = status;
      await user.save();

      pubsub.publish(CHAT_ACTION, {
        joinChannel: { type: ACTION_STATUS_CHANGED, member: user },
      });

      return res.sendStatus(204);
    }
  } catch (err) {
    return res.sendStatus(204);
  }

  return res.sendStatus(204);
};
