const User = require('../models/user');
const { decodeToken } = require('../utils/token');
const { pubsub, CHAT_ACTION, ACTION_STATUS_CHANGED } = require('../utils/pubsub');

exports.setOffline = async (req, res, next) => {
  const { token } = req.body;

  if (!token) return res.sendStatus(204);

  try {
    const decoded = await decodeToken(token);
    const user = await User.findById(decoded.id);

    if (user) {
      user.online = 'offline';
      await user.save();

      pubsub.publish(CHAT_ACTION, {
        joinChannel: { type: ACTION_STATUS_CHANGED, member: user },
      });
    }

    return res.sendStatus(204);
  } catch (err) {
    return res.sendStatus(204);
  }
};
